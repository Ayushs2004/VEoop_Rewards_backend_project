const withdrawalService = require('../services/withdrawalService');
const { sendSuccess, sendError } = require('../utils/response');
const { USER_ROLES } = require('../config/constants');

/**
 * Submit a new withdrawal request
 */
const createWithdrawal = async (req, res, next) => {
  try {
    const idempotencyKey =
      req.headers['idempotency-key'] ||
      req.headers['x-idempotency-key'] ||
      req.body.idempotencyKey ||
      null;

    const { method, optionId, payoutDetails } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await withdrawalService.createWithdrawal({
      userId: req.user.id,
      method,
      optionId,
      payoutDetails,
      idempotencyKey,
      ip,
      userAgent
    });

    if (result.isIdempotentReplay) {
      res.setHeader('X-Idempotent-Replay', 'true');
      return sendSuccess(
        res,
        200,
        'This withdrawal request has already been submitted.',
        result.withdrawal,
        { isIdempotentReplay: true }
      );
    }

    return sendSuccess(
      res,
      201,
      'Withdrawal request created successfully and is pending review.',
      result.withdrawal,
      {
        transactionId: result.transaction.transactionId,
        remainingBalance: result.wallet.ves
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch withdrawals list
 * Non-admins can only see their own withdrawals
 */
const getWithdrawals = async (req, res, next) => {
  try {
    const { page, limit, status, method, search, startDate, endDate, userId: queryUserId } = req.query;

    const isAdmin = req.user.role === USER_ROLES.ADMIN;
    let targetUserId = req.user.id;
    if (isAdmin) {
      targetUserId = queryUserId || null;
    }

    const result = await withdrawalService.getWithdrawals({
      userId: targetUserId,
      status,
      method,
      search,
      startDate,
      endDate,
      page,
      limit,
      isAdmin
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
 * Fetch single withdrawal by withdrawalId
 * Enforces strict user isolation: User A cannot view User B's withdrawal
 */
const getWithdrawalById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    const withdrawal = await withdrawalService.getWithdrawalById(id, null, isAdmin);
    if (!withdrawal) {
      return sendError(res, 404, 'Withdrawal not found.', 'NOT_FOUND');
    }

    // Role check: Regular user can only view their own
    const ownerId = (withdrawal.userId?._id || withdrawal.userId).toString();
    if (!isAdmin && ownerId !== req.user.id.toString()) {
      return sendError(
        res,
        403,
        'Access denied. You do not have permission to view this withdrawal.',
        'FORBIDDEN'
      );
    }

    return sendSuccess(res, 200, 'Withdrawal details fetched successfully.', withdrawal);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Approve a withdrawal
 */
const approveWithdrawal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const withdrawal = await withdrawalService.approveWithdrawal({
      withdrawalId: id,
      adminId: req.user.id,
      reviewNote,
      ip,
      userAgent
    });

    return sendSuccess(res, 200, 'Withdrawal approved successfully.', withdrawal);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Reject a withdrawal and trigger ledger refund reversal
 */
const rejectWithdrawal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await withdrawalService.rejectWithdrawal({
      withdrawalId: id,
      adminId: req.user.id,
      reason,
      ip,
      userAgent
    });

    return sendSuccess(
      res,
      200,
      'Withdrawal rejected and balance safely refunded to user.',
      result
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWithdrawal,
  getWithdrawals,
  getWithdrawalById,
  approveWithdrawal,
  rejectWithdrawal
};
