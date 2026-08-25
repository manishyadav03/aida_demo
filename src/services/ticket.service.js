const Ticket = require('../models/Ticket');
const { generateTicketNumber } = require('../utils/ticket');
const { AppError } = require('../utils/response');

/**
 * Create a new service ticket.
 * @param {object} params
 * @param {string} params.accountId
 * @param {string} [params.cardId]
 * @param {string} [params.type='CARD_BLOCK']
 * @param {string} [params.reason]
 * @param {string} [params.status='SUCCESS']
 * @returns {Promise<import('mongoose').Document>}
 */
async function createTicket({ accountId, cardId, type = 'CARD_BLOCK', reason, status = 'SUCCESS' }) {
  try {
    const ticketNumber = generateTicketNumber();
    const ticket = await Ticket.create({
      ticketNumber,
      accountId,
      cardId,
      type,
      reason,
      status,
    });
    return ticket;
  } catch (error) {
    throw new AppError(500, 'TICKET_CREATION_FAILED', `Failed to generate ticket: ${error.message}`);
  }
}

/**
 * Find ticket by its reference number.
 * @param {string} ticketNumber
 * @returns {Promise<import('mongoose').Document>}
 */
async function getTicketByNumber(ticketNumber) {
  const ticket = await Ticket.findOne({ ticketNumber });
  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket '${ticketNumber}' not found`);
  }
  return ticket;
}

module.exports = {
  createTicket,
  getTicketByNumber,
};
