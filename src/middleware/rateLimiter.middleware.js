const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for sensitive authentication attempts.
 * Prevents brute force PIN guessing attacks.
 */
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes default
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10), // Limit each IP to 20 auth requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many authentication attempts from this IP, please try again later.',
  },
  skip: () => process.env.NODE_ENV === 'test', // Skip in automated tests
});

/**
 * General API rate limiter for all tool endpoints.
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please slow down.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = {
  authLimiter,
  generalLimiter,
};
