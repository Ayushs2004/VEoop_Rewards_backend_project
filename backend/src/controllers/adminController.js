const mongoose = require('mongoose');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Withdrawal = require('../models/Withdrawal');
const WalletTransaction = require('../models/WalletTransaction');
const AuditLog = require('../models/AuditLog');
const walletService = require('../services/walletService');
const withdrawalService = require('../services/withdrawalService');
const { WITHDRAWAL_STATUS, ACCOUNT_STATUS, TRANSACTION_STATUS, TRANSACTION_TYPES } = require('../config/constants');
const { sendSuccess, sendError } = require('../utils/response');
const { maskPayoutDetails } = require('../utils/masker');

/**
 * 1. Admin Dashboard Overview Statistics
 */
const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalPendingWithdrawals,
      totalApprovedWithdrawals,
      totalRejectedWithdrawals,
      walletsAggregate,
      pendingAmountsAgg,
      approvedAmountsAgg,
      recentTransactions,
      recentAuditLogs
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ accountStatus: ACCOUNT_STATUS.ACTIVE }),
      Withdrawal.countDocuments({ status: WITHDRAWAL_STATUS.PENDING }),
      Withdrawal.countDocuments({ status: WITHDRAWAL_STATUS.APPROVED }),
      Withdrawal.countDocuments({ status: WITHDRAWAL_STATUS.REJECTED }),
      Wallet.aggregate([
        {
          $group: {
            _id: null,
            totalVEs: { $sum: '$ves' },
            totalSVEs: { $sum: '$sves' },
            totalGems: { $sum: '$gems' },
            totalTokens: { $sum: '$tokens' },
            totalSpins: { $sum: '$spins' },
            avgVEs: { $avg: '$ves' }
          }
        }
      ]),
      Withdrawal.aggregate([
        { $match: { status: WITHDRAWAL_STATUS.PENDING } },
        {
          $group: {
            _id: null,
            totalPendingVEs: { $sum: '$currencyAmount' },
            totalPendingPayoutINR: {
              $sum: { $cond: [{ $eq: ['$payoutCurrency', 'INR'] }, '$payoutAmount', 0] }
            },
            totalPendingPayoutUSD: {
              $sum: { $cond: [{ $eq: ['$payoutCurrency', 'USD'] }, '$payoutAmount', 0] }
            }
          }
        }
      ]),
      Withdrawal.aggregate([
        { $match: { status: WITHDRAWAL_STATUS.APPROVED } },
        {
          $group: {
            _id: null,
            totalApprovedVEs: { $sum: '$currencyAmount' },
            totalApprovedPayoutINR: {
              $sum: { $cond: [{ $eq: ['$payoutCurrency', 'INR'] }, '$payoutAmount', 0] }
            },
            totalApprovedPayoutUSD: {
              $sum: { $cond: [{ $eq: ['$payoutCurrency', 'USD'] }, '$payoutAmount', 0] }
            }
          }
        }
      ]),
      WalletTransaction.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('userId', 'name email accountStatus')
        .lean(),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('actorId', 'name email role')
        .populate('targetUserId', 'name email')
        .lean()
    ]);

    const systemCirculation = walletsAggregate[0] || {
      totalVEs: 0,
      totalSVEs: 0,
      totalGems: 0,
      totalTokens: 0,
      totalSpins: 0,
      avgVEs: 0
    };

    const pendingSummary = pendingAmountsAgg[0] || {
      totalPendingVEs: 0,
      totalPendingPayoutINR: 0,
      totalPendingPayoutUSD: 0
    };

    const approvedSummary = approvedAmountsAgg[0] || {
      totalApprovedVEs: 0,
      totalApprovedPayoutINR: 0,
      totalApprovedPayoutUSD: 0
    };

    return sendSuccess(res, 200, 'Admin overview stats fetched successfully.', {
      users: {
        total: totalUsers,
        active: activeUsers
      },
      withdrawals: {
        pending: totalPendingWithdrawals,
        approved: totalApprovedWithdrawals,
        rejected: totalRejectedWithdrawals,
        totalPendingVEs: pendingSummary.totalPendingVEs,
        totalPendingPayoutINR: pendingSummary.totalPendingPayoutINR,
        totalPendingPayoutUSD: pendingSummary.totalPendingPayoutUSD,
        totalApprovedVEs: approvedSummary.totalApprovedVEs,
        totalApprovedPayoutINR: approvedSummary.totalApprovedPayoutINR,
        totalApprovedPayoutUSD: approvedSummary.totalApprovedPayoutUSD
      },
      circulation: systemCirculation,
      recentTransactions,
      recentAuditLogs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. User Management: Searchable, Paginated Users Table with Live Wallet Balances
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', role = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && status !== 'ALL') filter.accountStatus = status;
    if (role && role !== 'ALL') filter.role = role;

    if (search && search.trim()) {
      const term = search.trim();
      if (mongoose.Types.ObjectId.isValid(term)) {
        filter.$or = [
          { _id: new mongoose.Types.ObjectId(term) },
          { email: new RegExp(term, 'i') },
          { name: new RegExp(term, 'i') }
        ];
      } else {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { email: new RegExp(escaped, 'i') },
          { name: new RegExp(escaped, 'i') }
        ];
      }
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter)
    ]);

    // Fetch live wallets for these users
    const userIds = users.map((u) => u._id);
    const wallets = await Wallet.find({ userId: { $in: userIds } }).lean();
    const walletMap = new Map(wallets.map((w) => [w.userId.toString(), w]));

    const usersWithWallets = users.map((u) => {
      const w = walletMap.get(u._id.toString()) || {
        ves: 0,
        sves: 0,
        gems: 0,
        tokens: 0,
        spins: 0
      };
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        accountStatus: u.accountStatus,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        wallet: {
          ves: w.ves,
          sves: w.sves,
          gems: w.gems,
          tokens: w.tokens,
          spins: w.spins
        }
      };
    });

    return sendSuccess(res, 200, 'Users fetched successfully.', usersWithWallets, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. User Management: Individual User Profile & Wallet Details
 */
const getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    let user;

    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).lean();
    } else if (id.includes('@')) {
      user = await User.findOne({ email: id.toLowerCase() }).lean();
    } else {
      user = await User.findOne({ name: new RegExp(`^${id}$`, 'i') }).lean();
    }

    if (!user) {
      return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
    }

    const [wallet, txCount, withdrawalCount, withdrawalStats, ledgerMetrics] = await Promise.all([
      walletService.getWallet(user._id),
      WalletTransaction.countDocuments({ userId: user._id }),
      Withdrawal.countDocuments({ userId: user._id }),
      Withdrawal.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalCurrencyAmount: { $sum: '$currencyAmount' },
            totalPayoutAmount: { $sum: '$payoutAmount' }
          }
        }
      ]),
      WalletTransaction.aggregate([
        { $match: { userId: user._id, status: TRANSACTION_STATUS.SUCCESS } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    let totalCredited = 0;
    let totalDebited = 0;
    ledgerMetrics.forEach((item) => {
      if (item._id === TRANSACTION_TYPES.CREDIT) totalCredited = item.total;
      if (item._id === TRANSACTION_TYPES.DEBIT) totalDebited = item.total;
    });

    return sendSuccess(res, 200, 'User details fetched successfully.', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      wallet: {
        ves: wallet.ves,
        sves: wallet.sves,
        gems: wallet.gems,
        tokens: wallet.tokens,
        spins: wallet.spins
      },
      metrics: {
        totalTransactions: txCount,
        totalWithdrawals: withdrawalCount,
        totalCreditedVEs: totalCredited,
        totalDebitedVEs: totalDebited,
        withdrawalBreakdown: withdrawalStats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. User Management: Paginated Transaction Ledger for Specific User
 */
const getUserTransactions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit, currency, type } = req.query;

    let targetUserId = id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const user = await User.findOne({ email: id.toLowerCase() });
      if (!user) {
        return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
      }
      targetUserId = user._id;
    }

    const result = await walletService.getTransactions(targetUserId, {
      page,
      limit,
      currency,
      type
    });

    return sendSuccess(
      res,
      200,
      'User transactions fetched successfully.',
      result.transactions,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 5. User Management: Paginated Withdrawals for Specific User
 */
const getUserWithdrawals = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit, status } = req.query;

    let targetUserId = id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const user = await User.findOne({ email: id.toLowerCase() });
      if (!user) {
        return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
      }
      targetUserId = user._id;
    }

    const result = await withdrawalService.getWithdrawals({
      userId: targetUserId,
      status,
      page,
      limit,
      isAdmin: true
    });

    return sendSuccess(
      res,
      200,
      'User withdrawals fetched successfully.',
      result.withdrawals,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Withdrawal Management: Paginated List with Rich Filters
 */
const getAllWithdrawals = async (req, res, next) => {
  try {
    const { page, limit, status, method, search, startDate, endDate, userId } = req.query;

    const result = await withdrawalService.getWithdrawals({
      userId: userId || null,
      status,
      method,
      search,
      startDate,
      endDate,
      page,
      limit,
      isAdmin: true
    });

    return sendSuccess(
      res,
      200,
      'Withdrawals fetched successfully.',
      result.withdrawals,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Withdrawal Management: Individual Withdrawal Details with Transaction & Audit Trail
 */
const getWithdrawalDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const withdrawal = await withdrawalService.getWithdrawalById(id, null, true);
    if (!withdrawal) {
      return sendError(res, 404, 'Withdrawal request not found.', 'NOT_FOUND');
    }

    // Fetch associated transaction and audit records
    const [transaction, auditLogs] = await Promise.all([
      WalletTransaction.findOne({
        $or: [
          { referenceId: withdrawal.withdrawalId },
          { transactionId: withdrawal.transactionId }
        ]
      }).lean(),
      AuditLog.find({ referenceId: withdrawal.withdrawalId })
        .sort({ createdAt: -1 })
        .populate('actorId', 'name email role')
        .lean()
    ]);

    return sendSuccess(res, 200, 'Withdrawal details fetched successfully.', {
      withdrawal: {
        ...withdrawal,
        payoutDetails: maskPayoutDetails(withdrawal.payoutDetails)
      },
      transaction,
      auditLogs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Audit Logs: Paginated Audit History
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, action, targetType } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (action && action !== 'ALL') filter.action = action;
    if (targetType && targetType !== 'ALL') filter.targetType = targetType;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('actorId', 'name email role')
        .populate('targetUserId', 'name email')
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    return sendSuccess(res, 200, 'Audit logs fetched successfully.', logs, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getUsers,
  getUserDetails,
  getUserTransactions,
  getUserWithdrawals,
  getAllWithdrawals,
  getWithdrawalDetails,
  getAuditLogs
};
