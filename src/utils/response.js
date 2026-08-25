/**
 * Standard Custom Application Error
 */
class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Standardized application error code
   * @param {string} message - Human-readable error message
   */
  constructor(statusCode, errorCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standard Success Response Formatter
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {object} payload
 */
function sendSuccess(res, statusCode, payload) {
  return res.status(statusCode).json({
    success: true,
    ...payload,
  });
}

/**
 * Standard Error Response Formatter
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} errorCode
 * @param {string} message
 */
function sendError(res, statusCode, errorCode, message) {
  return res.status(statusCode).json({
    success: false,
    error: errorCode,
    message,
  });
}

module.exports = {
  AppError,
  sendSuccess,
  sendError,
};
