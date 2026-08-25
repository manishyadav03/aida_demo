const jwt = require('jsonwebtoken');

const DEFAULT_SECRET = 'aida_voice_banking_default_jwt_secret_key_change_in_prod';
const DEFAULT_EXPIRES_IN = '15m';

/**
 * Generate a short-lived session token for an authenticated user.
 * @param {object} payload
 * @param {string} payload.userId
 * @param {string} payload.accountNumber
 * @param {string} payload.name
 * @returns {string} Signed JWT token
 */
function generateSessionToken(payload) {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN;

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify a session token.
 * @param {string} token
 * @returns {object} Decoded token payload
 */
function verifySessionToken(token) {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  return jwt.verify(token, secret);
}

module.exports = {
  generateSessionToken,
  verifySessionToken,
};
