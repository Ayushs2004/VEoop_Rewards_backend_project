const mongoose = require('mongoose');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const PayoutOption = require('../models/PayoutOption');
const walletService = require('./walletService');
const auditService = require('./auditService');
const {
  WITHDRAWAL_STATUS,
  TRANSACTION_SOURCES,
  ACCOUNT_STATUS,
  PAYOUT_METHODS,
  AUDIT_ACTIONS
} = require('../config/constants');
const { generateWithdrawalId } = require('../utils/idGenerator');

/**
 * Validate method-specific payout details
 */
const validatePayoutDetails = (method, details) => {
  if (!details || typeof details !== 'object') {
    throw new Error('Payout details are required');
  }

  const normalizedMethod = String(method).trim().toUpperCase();

  switch (normalizedMethod) {
    case PAYOUT_METHODS.UPI: {
      const upiId = details.upiId ? String(details.upiId).trim() : '';
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiId || !upiRegex.test(upiId)) {
        const error = new Error('Invalid UPI ID format. Expected format: username@bank');
        error.code = 'INVALID_PAYOUT_DETAILS';
        error.statusCode = 400;
        throw error;
      }
      return { upiId };
    }
    case PAYOUT_METHODS.PAYPAL:
    case PAYOUT_METHODS.AMAZON_GIFT_CARD:
    case PAYOUT_METHODS.GOOGLE_PLAY_GIFT_CARD: {
      const email = details.email ? String(details.email).trim().toLowerCase() : '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        const error = new Error('A valid email address is required for this payout method');
        error.code = 'INVALID_PAYOUT_DETAILS';
        error.statusCode = 400;
        throw error;
      }
      return { email };
    }
    default: {
      const error = new Error(`Unsupported payout method: ${method}`);
      error.code = 'UNSUPPORTED_METHOD';
      error.statusCode = 400;
      throw error;
    }
  }
};

/**
 * Helper to check if transactions can run on this mongoose connection
 */
const canUseTransactions = () => {
  const conn = mongoose.connection;
  const topologyType = conn?.client?.topology?.description?.type;
  return Boolean(topologyType && topologyType.includes('ReplicaSet'));
};

/**
 * Create a new withdrawal request with atomic deduction and idempotency
 */
const createWithdrawal = async ({
  userId,
  method,
  optionId,
  payoutDetails,
  idempotencyKey = null,
  ip = null,
  userAgent = null
}) => {
  // 1. Idempotency Check: Return existing withdrawal if key matches
  if (idempotencyKey) {
    const existing = await Withdrawal.findOne({ userId, idempotencyKey });
    if (existing) {
      return {
        withdrawal: existing,
        isIdempotentReplay: true
      };
    }
  }

  // 2. User Status Validation
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.code = 'USER_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  if (user.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
    const error = new Error(`Account is currently ${user.accountStatus.toLowerCase()}. Withdrawals are disabled.`);
    error.code = 'ACCOUNT_RESTRICTED';
    error.statusCode = 403;
    throw error;
  }

  // 3. Payout Option Validation (Authoritative from Database)
  const option = await PayoutOption.findOne({ optionId });
  if (!option) {
    const error = new Error('Selected payout option is unavailable.');
    error.code = 'INVALID_PAYOUT_OPTION';
    error.statusCode = 400;
    throw error;
  }
  if (!option.active) {
    const error = new Error('Selected payout option is currently unavailable.');
    error.code = 'INACTIVE_PAYOUT_OPTION';
    error.statusCode = 400;
    throw error;
  }
  if (option.method !== String(method).trim().toUpperCase()) {
    const error = new Error('Selected payout option does not match the chosen payout method.');
    error.code = 'PAYOUT_METHOD_MISMATCH';
    error.statusCode = 400;
    throw error;
  }

  // 4. Validate Payout Details
  const cleanPayoutDetails = validatePayoutDetails(option.method, payoutDetails);

  // 5. Backend calculates exact amounts (never trusting frontend inputs)
  const currency = option.currency;
  const currencyAmount = option.requiredAmount;
  const payoutAmount = option.payoutValue;
  const payoutCurrency = option.payoutCurrency;
  const withdrawalId = generateWithdrawalId();

  // 6. Execute atomic operation
  const useSession = canUseTransactions();
  let session = null;

  if (useSession) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }
  }

  let isDeducted = false;

  try {
    // Deduct wallet with atomic balance constraint
    const { wallet, transaction } = await walletService.debitWallet({
      userId,
      currency,
      amount: currencyAmount,
      source: TRANSACTION_SOURCES.WITHDRAWAL,
      referenceId: withdrawalId,
      description: `Redemption for ${option.name}`,
      metadata: {
        method: option.method,
        optionId: option.optionId,
        payoutAmount,
        payoutCurrency
      },
      session: session || null
    });

    isDeducted = true;

    // Create withdrawal document
    const withdrawal = new Withdrawal({
      withdrawalId,
      userId,
      method: option.method,
      optionId: option.optionId,
      currency,
      currencyAmount,
      payoutAmount,
      payoutCurrency,
      payoutDetails: cleanPayoutDetails,
      status: WITHDRAWAL_STATUS.PENDING,
      transactionId: transaction.transactionId,
      idempotencyKey: idempotencyKey || null,
      requestedAt: new Date()
    });

    if (session) {
      await withdrawal.save({ session });
    } else {
      await withdrawal.save();
    }

    // Audit log
    await auditService.logAction({
      actorId: userId,
      action: AUDIT_ACTIONS.WITHDRAWAL_CREATED,
      targetUserId: userId,
      targetType: 'WITHDRAWAL',
      referenceId: withdrawalId,
      metadata: {
        currencyAmount,
        payoutAmount,
        payoutCurrency,
        method: option.method,
        optionId: option.optionId,
        idempotencyKey
      },
      ip,
      userAgent,
      session: session || null
    });

    if (session) {
      await session.commitTransaction();
    }

    return {
      withdrawal,
      wallet,
      transaction,
      isIdempotentReplay: false
    };
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        // ignore abort errors
      }
    } else if (isDeducted) {
      // If we deducted outside a replica set and an error occurred before completion,
      // safely refund the wallet to maintain consistency
      try {
        await walletService.creditWallet({
          userId,
          currency,
          amount: currencyAmount,
          source: TRANSACTION_SOURCES.CORRECTION,
          referenceId: withdrawalId,
          description: `Automatic rollback due to withdrawal creation failure: ${error.message}`
        });
      } catch (refundError) {
        console.error('[WithdrawalService] Critical: Failed to rollback atomic deduction:', refundError.message);
      }
    }

    // Handle duplicate key error (race condition on idempotency key)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.idempotencyKey) {
      const existing = await Withdrawal.findOne({ userId, idempotencyKey });
      if (existing) {
        return {
          withdrawal: existing,
          isIdempotentReplay: true
        };
      }
    }

    throw error;
  } finally {
    if (useSession && session) {
      session.endSession();
    }
  }
};

/**
 * Approve a pending withdrawal (Admin only)
 */
const approveWithdrawal = async ({ withdrawalId, adminId, reviewNote = null, ip = null, userAgent = null }) => {
  const withdrawal = await Withdrawal.findOne({ withdrawalId });
  if (!withdrawal) {
    const error = new Error('Withdrawal request not found');
    error.code = 'WITHDRAWAL_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  if (withdrawal.status !== WITHDRAWAL_STATUS.PENDING && withdrawal.status !== WITHDRAWAL_STATUS.PROCESSING) {
    const error = new Error(`Cannot approve withdrawal with status ${withdrawal.status}`);
    error.code = 'INVALID_STATUS_TRANSITION';
    error.statusCode = 400;
    throw error;
  }

  withdrawal.status = WITHDRAWAL_STATUS.APPROVED;
  withdrawal.reviewNote = reviewNote;
  withdrawal.processedAt = new Date();
  await withdrawal.save();

  await auditService.logAction({
    actorId: adminId,
    action: AUDIT_ACTIONS.WITHDRAWAL_APPROVED,
    targetUserId: withdrawal.userId,
    targetType: 'WITHDRAWAL',
    referenceId: withdrawal.withdrawalId,
    metadata: {
      reviewNote,
      payoutAmount: withdrawal.payoutAmount,
      payoutCurrency: withdrawal.payoutCurrency
    },
    ip,
    userAgent
  });

  return withdrawal;
};

/**
 * Reject a withdrawal and execute safe ledger reversal / refund (Admin only)
 * Follows Option A financial strategy: safe credit reversal ledger entry, original debit preserved.
 */
const rejectWithdrawal = async ({ withdrawalId, adminId, reason = 'Administrative rejection', ip = null, userAgent = null }) => {
  const withdrawal = await Withdrawal.findOne({ withdrawalId });
  if (!withdrawal) {
    const error = new Error('Withdrawal request not found');
    error.code = 'WITHDRAWAL_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  if (withdrawal.status !== WITHDRAWAL_STATUS.PENDING && withdrawal.status !== WITHDRAWAL_STATUS.PROCESSING) {
    const error = new Error(`Cannot reject withdrawal with status ${withdrawal.status}`);
    error.code = 'INVALID_STATUS_TRANSITION';
    error.statusCode = 400;
    throw error;
  }

  // 1. Reversal: Refund the deducted currency back to the user's wallet via a new ledger entry
  const { wallet, transaction: reversalTransaction } = await walletService.creditWallet({
    userId: withdrawal.userId,
    currency: withdrawal.currency,
    amount: withdrawal.currencyAmount,
    source: TRANSACTION_SOURCES.WITHDRAWAL_REFUND,
    referenceId: withdrawal.withdrawalId,
    description: `Refund for rejected withdrawal (${withdrawal.withdrawalId}): ${reason}`,
    metadata: {
      originalTransactionId: withdrawal.transactionId,
      rejectedBy: adminId,
      reason
    }
  });

  // 2. Update withdrawal status
  withdrawal.status = WITHDRAWAL_STATUS.REJECTED;
  withdrawal.rejectionReason = reason;
  withdrawal.processedAt = new Date();
  await withdrawal.save();

  // 3. Create audit entry
  await auditService.logAction({
    actorId: adminId,
    action: AUDIT_ACTIONS.WITHDRAWAL_REJECTED,
    targetUserId: withdrawal.userId,
    targetType: 'WITHDRAWAL',
    referenceId: withdrawal.withdrawalId,
    metadata: {
      reason,
      reversalTransactionId: reversalTransaction.transactionId,
      refundedAmount: withdrawal.currencyAmount,
      currency: withdrawal.currency
    },
    ip,
    userAgent
  });

  return {
    withdrawal,
    wallet,
    reversalTransaction
  };
};

const { maskPayoutDetails } = require('../utils/masker');

/**
 * Fetch withdrawals for a user or admin with rich filtering, search and masking
 */
const getWithdrawals = async ({
  userId = null,
  status = null,
  method = null,
  search = null,
  startDate = null,
  endDate = null,
  page = 1,
  limit = 20,
  isAdmin = false
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (userId) filter.userId = userId;
  if (status && status !== 'ALL') filter.status = status;
  if (method && method !== 'ALL') filter.method = String(method).trim().toUpperCase();

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  if (search && search.trim()) {
    const term = search.trim();
    if (isAdmin && !userId) {
      const matchedUsers = await User.find({
        $or: [
          { email: new RegExp(term, 'i') },
          { name: new RegExp(term, 'i') }
        ]
      }).select('_id');
      const matchedUserIds = matchedUsers.map((u) => u._id);

      filter.$or = [
        { withdrawalId: new RegExp(term, 'i') },
        { userId: { $in: matchedUserIds } }
      ];
    } else {
      filter.withdrawalId = new RegExp(term, 'i');
    }
  }

  let query = Withdrawal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum);
  if (isAdmin) {
    query = query.populate('userId', 'name email accountStatus role');
  }

  const [rawWithdrawals, total] = await Promise.all([
    query.lean(),
    Withdrawal.countDocuments(filter)
  ]);

  const withdrawals = rawWithdrawals.map((w) => ({
    ...w,
    payoutDetails: maskPayoutDetails(w.payoutDetails)
  }));

  return {
    withdrawals,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

/**
 * Fetch a single withdrawal by ID
 */
const getWithdrawalById = async (withdrawalId, userId = null, isAdmin = false) => {
  let query = Withdrawal.findOne({ withdrawalId });
  if (userId) {
    query = Withdrawal.findOne({ withdrawalId, userId });
  }
  if (isAdmin) {
    query = query.populate('userId', 'name email accountStatus role');
  }
  const item = await query.lean();
  if (item && item.payoutDetails) {
    item.payoutDetails = maskPayoutDetails(item.payoutDetails);
  }
  return item;
};

module.exports = {
  createWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  getWithdrawals,
  getWithdrawalById,
  validatePayoutDetails
};
