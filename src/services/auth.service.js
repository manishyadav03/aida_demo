const Account = require('../models/Account');
const { generateSessionToken } = require('../utils/jwt');
const { AppError } = require('../utils/response');

/**
 * Authenticate customer by Account Number and PIN, returning a short-lived sessionToken.
 * @param {string} accountNumber
 * @param {string} pin
 * @returns {Promise<{ authenticated: boolean, sessionToken: string, user: { userId: string, name: string }, message: string }>}
 */
async function authenticateCustomer(accountNumber, pin) {
  // Explicitly select the hidden PIN field for verification
  const account = await Account.findOne({ accountNumber }).select('+pin');

  if (!account) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Unable to authenticate the customer');
  }

  const isPinValid = await account.comparePin(pin);
  if (!isPinValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Unable to authenticate the customer');
  }

  const userId = account._id.toString();

  // Create short-lived authentication session token
  const sessionToken = generateSessionToken({
    userId,
    accountNumber: account.accountNumber,
    name: account.name,
  });

  // Strictly return only non-sensitive caller info and sessionToken, never balance or PIN
  return {
    authenticated: true,
    sessionToken,
    user: {
      userId,
      name: account.name,
    },
    message: 'Authentication successful',
  };
}

module.exports = {
  authenticateCustomer,
};
