const Account = require('../models/Account');
const { AppError } = require('../utils/response');

/**
 * Fetch account balance for an authenticated user.
 * @param {string} userId - Account ID
 * @returns {Promise<{ balance: number, currency: string }>}
 */
async function getAccountBalance(userId) {
  const account = await Account.findById(userId).select('balance');

  if (!account) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account could not be found');
  }

  return {
    balance: account.balance,
    currency: 'INR',
  };
}

module.exports = {
  getAccountBalance,
};
