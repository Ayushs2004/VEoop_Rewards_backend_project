const mongoose = require('mongoose');
const { CURRENCIES, TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../config/constants');

const walletTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    currency: {
      type: String,
      enum: Object.values(CURRENCIES),
      default: CURRENCIES.VES,
      required: true
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be non-negative']
    },
    balanceBefore: {
      type: Number,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    source: {
      type: String,
      required: true
    },
    referenceId: {
      type: String,
      index: true,
      default: null
    },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUS),
      default: TRANSACTION_STATUS.SUCCESS,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user transaction history lookup ordered by time
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ userId: 1, currency: 1 });
walletTransactionSchema.index({ createdAt: -1 });

walletTransactionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = WalletTransaction;
