const crypto = require('crypto');

/**
 * Generate a unique ticket reference number.
 * Format: CARD-BLK-<6 uppercase hex chars> e.g. CARD-BLK-8F31A2
 * @param {string} [prefix='CARD-BLK']
 * @returns {string}
 */
function generateTicketNumber(prefix = 'CARD-BLK') {
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${randomSuffix}`;
}

module.exports = {
  generateTicketNumber,
};
