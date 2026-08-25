const mongoose = require('mongoose');
const { AppError } = require('../utils/response');

/**
 * Validate that a string is a valid MongoDB ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/**
 * Middleware: Validate Authenticate Request Body
 */
function validateAuthenticateInput(req, res, next) {
  const { accountNumber, pin } = req.body || {};

  if (!accountNumber || typeof accountNumber !== 'string' || !accountNumber.trim()) {
    return next(new AppError(400, 'INVALID_INPUT', 'Account number is required and must be a non-empty string'));
  }

  if (!pin || typeof pin !== 'string' || !pin.trim()) {
    return next(new AppError(400, 'INVALID_INPUT', 'PIN is required and must be a non-empty string'));
  }

  req.body.accountNumber = accountNumber.trim();
  req.body.pin = pin.trim();

  next();
}

/**
 * Middleware: Validate Block Card Request Body
 */
function validateBlockCardInput(req, res, next) {
  const { cardLast4, reason } = req.body || {};

  if (!cardLast4 || typeof cardLast4 !== 'string' || !/^\d{4}$/.test(cardLast4.trim())) {
    return next(new AppError(400, 'INVALID_INPUT', 'cardLast4 is required and must be exactly 4 digits'));
  }

  if (reason && typeof reason !== 'string') {
    return next(new AppError(400, 'INVALID_INPUT', 'reason must be a string if provided'));
  }

  req.body.cardLast4 = cardLast4.trim();
  req.body.reason = (reason && reason.trim()) || 'Card block requested by user';

  next();
}

/**
 * Middleware: Validate Update User Request Body
 * Supports both nested `{ data: { ... } }` and flat fields (`lastAction`, `lastTicketNumber`, `phone`).
 */
function validateUpdateUserInput(req, res, next) {
  let { data, lastAction, lastTicketNumber, phone } = req.body || {};

  // If passed as flat fields, wrap into data object
  if (!data && (lastAction !== undefined || lastTicketNumber !== undefined || phone !== undefined)) {
    data = {};
    if (lastAction !== undefined) data.lastAction = lastAction;
    if (lastTicketNumber !== undefined) data.lastTicketNumber = lastTicketNumber;
    if (phone !== undefined) data.phone = phone;
    req.body.data = data;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
    return next(new AppError(400, 'INVALID_INPUT', 'Update fields (e.g. lastAction, lastTicketNumber, or data object) are required'));
  }

  next();
}

/**
 * Middleware: Validate Send Confirmation Email Request Body
 */
function validateEmailConfirmationInput(req, res, next) {
  const { ticketNumber } = req.body || {};

  if (!ticketNumber || typeof ticketNumber !== 'string' || !ticketNumber.trim()) {
    return next(new AppError(400, 'INVALID_INPUT', 'ticketNumber is required and must be a non-empty string'));
  }

  req.body.ticketNumber = ticketNumber.trim();
  next();
}

module.exports = {
  isValidObjectId,
  validateAuthenticateInput,
  validateBlockCardInput,
  validateUpdateUserInput,
  validateEmailConfirmationInput,
};
