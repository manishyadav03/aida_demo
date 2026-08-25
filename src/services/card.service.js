const mongoose = require('mongoose');
const Card = require('../models/Card');
const Account = require('../models/Account');
const Ticket = require('../models/Ticket');
const { generateTicketNumber } = require('../utils/ticket');
const { AppError } = require('../utils/response');

/**
 * Block customer card atomically using a MongoDB transaction.
 * Ensures card status update, ticket creation, and account metadata update happen as one logical unit.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user ID (derived from sessionToken)
 * @param {string} params.cardLast4 - Last 4 digits of the card
 * @param {string} params.reason - Reason for blocking the card
 * @returns {Promise<{ cardBlocked: boolean, ticketNumber: string, message: string }>}
 */
async function blockCustomerCard({ userId, cardLast4, reason }) {
  let session = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    const topologyType = mongoose.connection?.client?.topology?.description?.type;
    // MongoDB multi-document transactions require replica set or mongos (not Single)
    if (topologyType && topologyType !== 'Single' && topologyType !== 'Unknown') {
      session.startTransaction();
      useTransaction = true;
    }
  } catch (err) {
    session = null;
    useTransaction = false;
  }

  const sessionOpt = useTransaction && session ? { session } : {};

  try {
    // 1. Verify account exists
    const account = await Account.findById(userId, null, sessionOpt);
    if (!account) {
      throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account could not be found');
    }

    // 2. Look up card by last4
    const card = await Card.findOne({ last4: cardLast4 }, null, sessionOpt);
    if (!card) {
      throw new AppError(404, 'CARD_NOT_FOUND', `Card ending in ${cardLast4} could not be found`);
    }

    // 3. Verify card ownership
    if (card.accountId.toString() !== userId) {
      throw new AppError(403, 'UNAUTHORIZED_CARD_ACCESS', 'Card does not belong to this account');
    }

    // 4. Verify card is ACTIVE
    if (card.status === 'BLOCKED') {
      throw new AppError(400, 'CARD_ALREADY_BLOCKED', `Card ending in ${cardLast4} is already blocked`);
    }

    // 5. Block the card
    card.status = 'BLOCKED';
    card.blockedAt = new Date();
    card.blockReason = reason;
    await card.save(sessionOpt);

    // 6. Generate reference ticket
    const ticketNumber = generateTicketNumber();
    const [ticket] = await Ticket.create(
      [
        {
          ticketNumber,
          accountId: userId,
          cardId: card._id,
          type: 'CARD_BLOCK',
          reason,
          status: 'SUCCESS',
        },
      ],
      sessionOpt
    );

    // 7. Update customer account with last action and ticket reference
    account.lastAction = 'CARD_BLOCK';
    account.lastTicketNumber = ticket.ticketNumber;
    await account.save(sessionOpt);

    // 8. Commit Transaction
    if (useTransaction && session) {
      await session.commitTransaction();
    }

    return {
      cardBlocked: true,
      ticketNumber: ticket.ticketNumber,
      message: 'Card blocked successfully',
    };
  } catch (error) {
    if (useTransaction && session && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

module.exports = {
  blockCustomerCard,
};
