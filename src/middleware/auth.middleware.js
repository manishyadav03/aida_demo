const { verifySessionToken } = require('../utils/jwt');
const { AppError } = require('../utils/response');

/**
 * Middleware to authenticate requests using a short-lived session token.
 * Accepts sessionToken via Authorization header (Bearer token) or body/query payload.
 */
function authenticateSession(req, res, next) {
  let token;

  // 1. Check Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1].trim();
  } else if (req.body && req.body.sessionToken) {
    // 2. Check body parameter for tool-calling flexibility
    token = String(req.body.sessionToken).trim();
  } else if (req.query && req.query.sessionToken) {
    // 3. Check query parameter
    token = String(req.query.sessionToken).trim();
  }

  if (!token) {
    return next(
      new AppError(
        401,
        'UNAUTHORIZED',
        'Authentication required. Please provide a valid sessionToken in the Authorization header or request body.'
      )
    );
  }

  try {
    const decoded = verifySessionToken(token);
    // Attach validated caller info to request object
    req.user = {
      userId: decoded.userId,
      accountNumber: decoded.accountNumber,
      name: decoded.name,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(
        new AppError(401, 'SESSION_EXPIRED', 'Your authentication session has expired. Please authenticate again.')
      );
    }
    return next(
      new AppError(401, 'INVALID_SESSION_TOKEN', 'Invalid session token. Please re-authenticate.')
    );
  }
}

module.exports = {
  authenticateSession,
};
