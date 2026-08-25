const { AppError } = require('../utils/response');

/**
 * Global 404 Not Found Middleware
 */
function notFoundHandler(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));
}

/**
 * Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Default values
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID_FORMAT';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Handle MongoDB Duplicate Key (11000)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_RESOURCE';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A resource with that ${field} already exists`;
  }

  // Handle JSON parse syntax errors in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = 'INVALID_JSON_BODY';
    message = 'Malformed JSON payload in request body';
  }

  // Log non-operational (server/crash) errors for internal monitoring
  if (!err.isOperational && statusCode === 500) {
    console.error('[Unhandled Server Error]', {
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    // In production, mask internal error details
    if (process.env.NODE_ENV === 'production') {
      message = 'An unexpected internal error occurred';
    }
  }

  return res.status(statusCode).json({
    success: false,
    error: errorCode,
    message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
