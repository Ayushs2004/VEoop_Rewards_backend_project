const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { USER_ROLES } = require('../config/constants');

// Guard all admin routes with JWT authentication and Admin role authorization
router.use(authenticate, authorize(USER_ROLES.ADMIN));

// Dashboard Statistics & System Circulation
router.get('/stats', adminController.getAdminStats);

// User Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);
router.get('/users/:id/transactions', adminController.getUserTransactions);
router.get('/users/:id/withdrawals', adminController.getUserWithdrawals);

// Withdrawal Moderation
router.get('/withdrawals', adminController.getAllWithdrawals);
router.get('/withdrawals/:id', adminController.getWithdrawalDetails);

// Security & Audit Logs Trail
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
