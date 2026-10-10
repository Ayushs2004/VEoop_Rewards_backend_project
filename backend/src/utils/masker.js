/**
 * Mask sensitive payout details for administrative display
 */

const maskPayoutDetails = (details) => {
  if (!details || typeof details !== 'object') return {};
  const masked = { ...details };

  if (masked.upiId) {
    const parts = String(masked.upiId).split('@');
    if (parts.length === 2 && parts[0].length > 2) {
      masked.maskedUpiId = `${parts[0].slice(0, 2)}***@${parts[1]}`;
    } else {
      masked.maskedUpiId = `${parts[0].slice(0, 1)}***@${parts[1] || ''}`;
    }
  }

  if (masked.email) {
    const parts = String(masked.email).split('@');
    if (parts.length === 2 && parts[0].length > 2) {
      masked.maskedEmail = `${parts[0].slice(0, 1)}***${parts[0].slice(-1)}@${parts[1]}`;
    } else if (parts.length === 2) {
      masked.maskedEmail = `${parts[0].slice(0, 1)}***@${parts[1]}`;
    }
  }

  return masked;
};

module.exports = {
  maskPayoutDetails
};
