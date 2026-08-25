const express = require('express');
const router = express.Router();
const toolController = require('../controllers/tool.controller');
const {
  validateAuthenticateInput,
  validateBlockCardInput,
  validateUpdateUserInput,
  validateEmailConfirmationInput,
} = require('../middleware/validation.middleware');
const { authenticateSession } = require('../middleware/auth.middleware');
const { authLimiter, generalLimiter } = require('../middleware/rateLimiter.middleware');

// Tool 1: Authenticate Customer (Rate-limited, generates sessionToken)
router.post('/authenticate', authLimiter, validateAuthenticateInput, toolController.authenticateUser);

// Tool 2: Get Account Balance (Protected by sessionToken)
router.post('/balance', generalLimiter, authenticateSession, toolController.getAccountBalance);

// Tool 3: Block Card (Protected by sessionToken, atomic transaction)
router.post('/block-card', generalLimiter, authenticateSession, validateBlockCardInput, toolController.blockCard);

// Tool 4: Update User Profile / Action Data (Protected by sessionToken, field whitelisting)
router.post('/update-user', generalLimiter, authenticateSession, validateUpdateUserInput, toolController.updateUserData);

// Tool 5: Send Confirmation Email (Protected by sessionToken)
router.post('/send-confirmation-email', generalLimiter, authenticateSession, validateEmailConfirmationInput, toolController.sendConfirmationEmail);

module.exports = router;
