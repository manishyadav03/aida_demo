const Account = require('../models/Account');
const { AppError } = require('../utils/response');

// Explicit whitelist of fields permitted to be modified via tool endpoint
const ALLOWED_UPDATE_FIELDS = ['lastAction', 'lastTicketNumber', 'phone'];
const FORBIDDEN_UPDATE_FIELDS = ['accountNumber', 'balance', 'pin', '_id', 'createdAt', 'updatedAt', 'email'];

/**
 * Update whitelisted customer profile fields.
 * @param {object} params
 * @param {string} params.userId
 * @param {object} params.data
 * @returns {Promise<{ message: string, updatedFields: object }>}
 */
async function updateUserData({ userId, data }) {
  const account = await Account.findById(userId);
  if (!account) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account could not be found');
  }

  // Check for attempts to modify sensitive / forbidden fields
  const providedKeys = Object.keys(data);
  const attemptedForbidden = providedKeys.filter((key) => FORBIDDEN_UPDATE_FIELDS.includes(key));

  if (attemptedForbidden.length > 0) {
    throw new AppError(
      400,
      'UNAUTHORIZED_FIELD_UPDATE',
      `Updating sensitive fields [${attemptedForbidden.join(', ')}] is strictly forbidden`
    );
  }

  // Filter only allowed whitelisted fields
  const updates = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      updates[field] = data[field];
      account[field] = data[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(
      400,
      'INVALID_UPDATE_FIELDS',
      `No valid whitelisted fields provided for update. Allowed fields: [${ALLOWED_UPDATE_FIELDS.join(', ')}]`
    );
  }

  await account.save();

  return {
    message: 'User data updated successfully',
    updatedFields: updates,
  };
}

module.exports = {
  updateUserData,
  ALLOWED_UPDATE_FIELDS,
  FORBIDDEN_UPDATE_FIELDS,
};
