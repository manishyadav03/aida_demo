const authService = require('../services/auth.service');
const balanceService = require('../services/balance.service');
const cardService = require('../services/card.service');
const userService = require('../services/user.service');
const emailService = require('../services/email.service');
const { sendSuccess } = require('../utils/response');

/**
 * Health check endpoint controller
 */
function healthCheck(req, res) {
  return sendSuccess(res, 200, { message: 'API is running' });
}

/**
 * Tool 1: Authenticate Customer
 * POST /api/tools/authenticate
 */
async function authenticateUser(req, res, next) {
  try {
    const { accountNumber, pin } = req.body;
    const result = await authService.authenticateCustomer(accountNumber, pin);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Tool 2: Get Account Balance
 * POST /api/tools/balance (Requires authenticated session)
 */
async function getAccountBalance(req, res, next) {
  try {
    const userId = req.user.userId;
    const result = await balanceService.getAccountBalance(userId);
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Tool 3: Block Customer Card
 * POST /api/tools/block-card (Requires authenticated session)
 */
async function blockCard(req, res, next) {
  try {
    const userId = req.user.userId;
    const { cardLast4, reason } = req.body;
    const result = await cardService.blockCustomerCard({ userId, cardLast4, reason });
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Tool 4: Update User Data
 * POST /api/tools/update-user (Requires authenticated session)
 */
async function updateUserData(req, res, next) {
  try {
    const userId = req.user.userId;
    const { data } = req.body;
    const result = await userService.updateUserData({ userId, data });
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Tool 5: Send Confirmation Email
 * POST /api/tools/send-confirmation-email (Requires authenticated session)
 */
async function sendConfirmationEmail(req, res, next) {
  try {
    const userId = req.user.userId;
    const { ticketNumber } = req.body;
    const result = await emailService.sendConfirmationEmail({ userId, ticketNumber });
    return sendSuccess(res, 200, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  healthCheck,
  authenticateUser,
  getAccountBalance,
  blockCard,
  updateUserData,
  sendConfirmationEmail,
};
