const { body } = require('express-validator');
const validate = require('../middleware/requestValidator');
const { CURRENCIES, TRANSACTION_SOURCES } = require('../config/constants');

const walletMutationValidator = [
  body('userId')
    .notEmpty()
    .withMessage('Target userId is required')
    .isString()
    .trim(),
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number greater than 0'),
  body('currency')
    .optional()
    .isIn(Object.values(CURRENCIES))
    .withMessage(`Currency must be one of: ${Object.values(CURRENCIES).join(', ')}`),
  body('source')
    .optional()
    .isIn(Object.values(TRANSACTION_SOURCES))
    .withMessage(`Source must be a valid transaction source`),
  body('description')
    .optional()
    .isString()
    .trim(),
  body('reason')
    .optional()
    .isString()
    .trim(),
  body().custom((value, { req }) => {
    const reasonText = (req.body.reason || req.body.description || '').trim();
    if (!reasonText) {
      throw new Error('A mandatory reason or description is required for each wallet adjustment');
    }
    return true;
  }),
  validate
];

module.exports = {
  walletMutationValidator
};
