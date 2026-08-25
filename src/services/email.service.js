const { Resend } = require('resend');
const Account = require('../models/Account');
const { getTicketByNumber } = require('./ticket.service');
const { AppError } = require('../utils/response');

/**
 * Send card block confirmation email to the customer via Resend.
 * Mocking is ONLY permitted in test mode (`NODE_ENV === 'test'`) or explicit `MOCK_EMAIL === 'true'`.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user ID
 * @param {string} params.ticketNumber - Reference ticket number
 * @returns {Promise<{ emailSent: boolean, message: string }>}
 */
async function sendConfirmationEmail({ userId, ticketNumber }) {
  // 1. Fetch authenticated customer account
  const account = await Account.findById(userId);
  if (!account) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account could not be found');
  }

  // 2. Fetch ticket and verify ownership
  const ticket = await getTicketByNumber(ticketNumber);
  if (ticket.accountId.toString() !== userId) {
    throw new AppError(403, 'UNAUTHORIZED_TICKET_ACCESS', 'Ticket does not belong to this customer account');
  }

  const fromEmail = process.env.EMAIL_FROM || 'Voice Banking <onboarding@resend.dev>';
  const subject = `Card Block Confirmation - Ref: ${ticket.ticketNumber}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a365d;">Card Blocking Confirmation</h2>
      <p>Dear <strong>${account.name}</strong>,</p>
      <p>This email confirms that your debit/credit card has been successfully <strong>BLOCKED</strong> as per your voice assistant request.</p>
      
      <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #e53e3e; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>Reference Ticket Number:</strong> <code>${ticket.ticketNumber}</code></p>
        <p style="margin: 0 0 8px 0;"><strong>Action:</strong> ${ticket.type}</p>
        <p style="margin: 0 0 8px 0;"><strong>Status:</strong> ${ticket.status}</p>
        <p style="margin: 0;"><strong>Reason:</strong> ${ticket.reason}</p>
      </div>

      <p>If you did not make this request or have questions, please contact our 24/7 fraud helpline immediately.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #718096;">This is an automated notification from your Voice Banking Assistant. Please do not reply to this email.</p>
    </div>
  `;

  // Explicit test / mock mode bypass
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true') {
    console.log(`[Email Service (Test/Mock Mode)] Confirmation email simulated for: ${account.email}`);
    console.log(`  Recipient: ${account.name} <${account.email}>`);
    console.log(`  Ticket: ${ticket.ticketNumber}`);
    return {
      emailSent: true,
      message: 'Confirmation email sent successfully (test mode)',
    };
  }

  // Real Resend email dispatching for demo & production environments
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey === 're_your_api_key_here') {
    throw new AppError(
      502,
      'RESEND_API_KEY_MISSING',
      'RESEND_API_KEY is not configured in the environment. Please configure a valid API key to send live emails.'
    );
  }

  try {
    const resend = new Resend(apiKey.trim());
    const response = await resend.emails.send({
      from: fromEmail,
      to: account.email,
      subject,
      html: htmlContent,
    });

    if (response.error) {
      console.error('[Resend Delivery Error]', response.error);
      throw new AppError(
        502,
        'EMAIL_DELIVERY_FAILED',
        `Resend email delivery failed: ${response.error.message || JSON.stringify(response.error)}`
      );
    }

    console.log(`[Email Service] Confirmation email successfully delivered via Resend to ${account.email} (Ticket: ${ticket.ticketNumber})`);

    return {
      emailSent: true,
      message: 'Confirmation email sent successfully',
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(`[Email Service Failure]: ${error.message}`);
    throw new AppError(502, 'EMAIL_DELIVERY_FAILED', `Failed to send confirmation email: ${error.message}`);
  }
}

module.exports = {
  sendConfirmationEmail,
};
