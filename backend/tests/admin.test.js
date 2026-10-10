const request = require('supertest');
const app = require('../src/app');
const walletService = require('../src/services/walletService');
const withdrawalService = require('../src/services/withdrawalService');
const PayoutOption = require('../src/models/PayoutOption');
const { setupTestDB, createTestUser } = require('./setup');
const { USER_ROLES, CURRENCIES, PAYOUT_METHODS, WITHDRAWAL_STATUS } = require('../src/config/constants');

setupTestDB();

describe('Admin Panel Management & Security APIs', () => {
  let admin, regularUser, option;

  beforeEach(async () => {
    admin = await createTestUser({
      email: 'admin@veloop.test',
      role: USER_ROLES.ADMIN,
      name: 'System Administrator'
    });

    regularUser = await createTestUser({
      email: 'user@veloop.test',
      role: USER_ROLES.USER,
      name: 'Regular Player',
      walletBalances: { ves: 10000, sves: 2000, gems: 50, tokens: 200, spins: 5 }
    });

    option = new PayoutOption({
      optionId: 'upi_test_admin',
      name: 'UPI ₹50',
      method: PAYOUT_METHODS.UPI,
      payoutValue: 50,
      payoutCurrency: 'INR',
      requiredAmount: 2400,
      currency: CURRENCIES.VES,
      active: true,
      displayOrder: 1
    });
    await option.save();
  });

  test('GET /api/admin/stats: Returns complete system overview, circulation, and recent activity', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users.total).toBe(2);
    expect(res.body.data.circulation.totalVEs).toBeGreaterThanOrEqual(10000);
    expect(res.body.data.withdrawals).toBeDefined();
    expect(Array.isArray(res.body.data.recentTransactions)).toBe(true);
    expect(Array.isArray(res.body.data.recentAuditLogs)).toBe(true);
  });

  test('GET /api/admin/users: Lists users with attached live wallet balances and supports search', async () => {
    // 1. List all users
    const resAll = await request(app)
      .get('/api/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(resAll.status).toBe(200);
    expect(resAll.body.success).toBe(true);
    expect(resAll.body.data.length).toBe(2);
    
    const foundUser = resAll.body.data.find(u => u.email === 'user@veloop.test');
    expect(foundUser).toBeDefined();
    expect(foundUser.wallet.ves).toBe(10000);
    expect(foundUser.wallet.gems).toBe(50);

    // 2. Search users by query
    const resSearch = await request(app)
      .get('/api/admin/users?search=Regular')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.length).toBe(1);
    expect(resSearch.body.data[0].email).toBe('user@veloop.test');
  });

  test('GET /api/admin/users/:id: Fetches individual user profile, wallet details, and metrics', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${regularUser.user._id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('user@veloop.test');
    expect(res.body.data.wallet.ves).toBe(10000);
    expect(res.body.data.metrics).toBeDefined();
  });

  test('GET /api/admin/users/:id/transactions: Returns paginated user transactions', async () => {
    // Credit wallet to create a transaction
    await walletService.creditWallet({
      userId: regularUser.user._id,
      currency: CURRENCIES.VES,
      amount: 1500,
      description: 'Test admin engagement credit'
    });

    const res = await request(app)
      .get(`/api/admin/users/${regularUser.user._id}/transactions?page=1&limit=10`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].amount).toBe(1500);
  });

  test('GET /api/admin/withdrawals: Returns filtered list and masks sensitive beneficiary details', async () => {
    // Create a withdrawal for the user
    const createRes = await withdrawalService.createWithdrawal({
      userId: regularUser.user._id,
      method: PAYOUT_METHODS.UPI,
      optionId: option.optionId,
      payoutDetails: { upiId: 'ayush@okhdfcbank' }
    });

    const res = await request(app)
      .get('/api/admin/withdrawals?status=PENDING&method=UPI')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].withdrawalId).toBe(createRes.withdrawal.withdrawalId);
    expect(res.body.data[0].payoutDetails.maskedUpiId).toBe('ay***@okhdfcbank');
    expect(res.body.data[0].userId.email).toBe('user@veloop.test');
  });

  test('GET /api/admin/withdrawals/:id: Returns full withdrawal details, ledger link, and audit trail', async () => {
    const createRes = await withdrawalService.createWithdrawal({
      userId: regularUser.user._id,
      method: PAYOUT_METHODS.UPI,
      optionId: option.optionId,
      payoutDetails: { upiId: 'ayush@okhdfcbank' }
    });

    const res = await request(app)
      .get(`/api/admin/withdrawals/${createRes.withdrawal.withdrawalId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.withdrawal.withdrawalId).toBe(createRes.withdrawal.withdrawalId);
    expect(res.body.data.transaction).toBeDefined();
    expect(res.body.data.transaction.balanceBefore).toBe(10000);
    expect(res.body.data.transaction.balanceAfter).toBe(7600);
    expect(Array.isArray(res.body.data.auditLogs)).toBe(true);
    expect(res.body.data.auditLogs.length).toBeGreaterThanOrEqual(1);
  });

  test('Security Guard: Regular user cannot access any /api/admin endpoint (403 Forbidden)', async () => {
    const endpoints = [
      '/api/admin/stats',
      '/api/admin/users',
      `/api/admin/users/${regularUser.user._id}`,
      '/api/admin/withdrawals',
      '/api/admin/audit-logs'
    ];

    for (const ep of endpoints) {
      const res = await request(app)
        .get(ep)
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    }
  });

  test('Wallet Adjustment: Mandatory reason is enforced and balance before/after is returned', async () => {
    // 1. Missing reason/description fails with 400
    const failRes = await request(app)
      .post('/api/wallet/credit')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        userId: regularUser.user._id,
        currency: 'VEs',
        amount: 500
      });

    expect(failRes.status).toBe(400);

    // 2. Providing valid reason succeeds and returns balanceBefore and balanceAfter
    const successRes = await request(app)
      .post('/api/wallet/credit')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        userId: regularUser.user._id,
        currency: 'VEs',
        amount: 500,
        reason: 'Monthly VIP bonus adjustment'
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.data.balanceBefore).toBe(10000);
    expect(successRes.body.data.balanceAfter).toBe(10500);
    expect(successRes.body.data.transaction).toBeDefined();
  });
});
