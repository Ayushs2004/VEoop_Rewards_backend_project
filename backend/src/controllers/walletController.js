const mongoose = require('mongoose');
const User = require('../models/User');
const walletService = require('../services/walletService');
const auditService = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/response');
const { AUDIT_ACTIONS, TRANSACTION_SOURCES } = require('../config/constants');

/**
 * Resolve target user by 'demo' keyword, email address, or MongoDB ObjectId
 */
const resolveTargetUserId = async (input) => {
  if (!input) return null;
  const str = input.trim();
  if (str.toLowerCase() === 'demo' || str.toLowerCase() === 'demouser') {
    const demo = await User.findOne({ email: 'demo@veloop.test' });
    if (demo) return demo._id.toString();
  }
  if (str.includes('@')) {
    const userByEmail = await User.findOne({ email: str.toLowerCase() });
    if (userByEmail) return userByEmail._id.toString();
  }
  if (mongoose.Types.ObjectId.isValid(str)) {
    return str;
  }
  const userByName = await User.findOne({ name: new RegExp(`^${str}$`, 'i') });
  if (userByName) return userByName._id.toString();

  return null;
};

/**
 * Fetch authenticated user's wallet
 * Note: userId is derived strictly from JWT (req.user.id)
 */
const getWallet = async (req, res, next) => {
  try {
    const wallet = await walletService.getWallet(req.user.id);
    return sendSuccess(res, 200, 'Wallet fetched successfully.', wallet);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch authenticated user's wallet summary & metrics
 */
const getWalletSummary = async (req, res, next) => {
  try {
    const summary = await walletService.getWalletSummary(req.user.id);
    return sendSuccess(res, 200, 'Wallet summary fetched successfully.', summary);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch paginated transaction history for authenticated user
 */
const getTransactions = async (req, res, next) => {
  try {
    const { page, limit, currency, type } = req.query;
    const result = await walletService.getTransactions(req.user.id, {
      page,
      limit,
      currency,
      type
    });

    return sendSuccess(
      res,
      200,
      'Transactions fetched successfully.',
      result.transactions,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Admin endpoint: Credit a user's wallet
 */
const creditWallet = async (req, res, next) => {
  try {
    const { userId, currency, amount, source, description, metadata } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const targetUserId = await resolveTargetUserId(userId);
    if (!targetUserId) {
      return sendError(
        res,
        404,
        `Target user '${userId}' not found. Please provide a valid email, 'demo', or MongoDB ObjectId.`,
        'USER_NOT_FOUND'
      );
    }

    const reason = (req.body.reason || req.body.description || '').trim();

    const result = await walletService.creditWallet({
      userId: targetUserId,
      currency,
      amount: parseFloat(amount),
      source: source || TRANSACTION_SOURCES.ADMIN_CREDIT,
      description: reason || `Admin balance adjustment credit by ${req.user.email}`,
      metadata: {
        adminId: req.user.id,
        originalInput: userId,
        reason,
        ...metadata
      }
    });

    // Record audit log
    await auditService.logAction({
      actorId: req.user.id,
      action: AUDIT_ACTIONS.WALLET_CREDIT,
      targetUserId: targetUserId,
      targetType: 'WALLET',
      referenceId: result.transaction.transactionId,
      metadata: {
        amount,
        currency: result.transaction.currency,
        balanceBefore: result.transaction.balanceBefore,
        balanceAfter: result.transaction.balanceAfter,
        newBalance: result.wallet.ves,
        userInput: userId,
        reason
      },
      ip,
      userAgent
    });

    return sendSuccess(res, 200, 'Wallet credited successfully.', {
      balanceBefore: result.transaction.balanceBefore,
      balanceAfter: result.transaction.balanceAfter,
      amount: result.transaction.amount,
      currency: result.transaction.currency,
      type: result.transaction.type,
      wallet: result.wallet,
      transaction: result.transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin endpoint: Debit a user's wallet
 */
const debitWallet = async (req, res, next) => {
  try {
    const { userId, currency, amount, source, description, reason: reqReason, metadata } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const targetUserId = await resolveTargetUserId(userId);
    if (!targetUserId) {
      return sendError(
        res,
        404,
        `Target user '${userId}' not found. Please provide a valid email, 'demo', or MongoDB ObjectId.`,
        'USER_NOT_FOUND'
      );
    }

    const reason = (reqReason || description || '').trim();

    const result = await walletService.debitWallet({
      userId: targetUserId,
      currency,
      amount: parseFloat(amount),
      source: source || TRANSACTION_SOURCES.ADMIN_DEBIT,
      description: reason || `Admin balance adjustment debit by ${req.user.email}`,
      metadata: {
        adminId: req.user.id,
        originalInput: userId,
        reason,
        ...metadata
      }
    });

    // Record audit log
    await auditService.logAction({
      actorId: req.user.id,
      action: AUDIT_ACTIONS.WALLET_DEBIT,
      targetUserId: targetUserId,
      targetType: 'WALLET',
      referenceId: result.transaction.transactionId,
      metadata: {
        amount,
        currency: result.transaction.currency,
        balanceBefore: result.transaction.balanceBefore,
        balanceAfter: result.transaction.balanceAfter,
        newBalance: result.wallet.ves,
        userInput: userId,
        reason
      },
      ip,
      userAgent
    });

    return sendSuccess(res, 200, 'Wallet debited successfully.', {
      balanceBefore: result.transaction.balanceBefore,
      balanceAfter: result.transaction.balanceAfter,
      amount: result.transaction.amount,
      currency: result.transaction.currency,
      type: result.transaction.type,
      wallet: result.wallet,
      transaction: result.transaction
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWallet,
  getWalletSummary,
  getTransactions,
  creditWallet,
  debitWallet
};
