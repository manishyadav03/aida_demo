const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.JWT_EXPIRES_IN = '15m';

const app = require('../src/app');
const Account = require('../src/models/Account');
const Card = require('../src/models/Card');
const Ticket = require('../src/models/Ticket');
const { seedDatabase } = require('../src/seed/seed');

let mongoServer;
let mongoUri;

describe('Voice Banking Tool Backend - Integration Test Suite (Token & Transaction Enhanced)', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await seedDatabase(mongoUri);
  });

  // 1. Health Check
  test('1. GET /health - should return API status', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'API is running');
  });

  // 2. Successful Authentication (Returns sessionToken, never balance/PIN)
  test('2. POST /api/tools/authenticate - should authenticate valid account and return sessionToken', async () => {
    const res = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100001', pin: '1234' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.authenticated, true);
    assert.ok(res.body.sessionToken, 'sessionToken must be returned');
    assert.ok(res.body.user, 'user object must be returned');
    assert.equal(res.body.user.name, 'Rahul Sharma');
    assert.ok(res.body.user.userId, 'userId must be in user object');
    assert.equal(res.body.balance, undefined, 'balance MUST NOT be returned');
    assert.equal(res.body.pin, undefined, 'PIN MUST NOT be returned');
  });

  // 3. Invalid Authentication (Wrong PIN)
  test('3. POST /api/tools/authenticate - should reject invalid PIN', async () => {
    const res = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100001', pin: '9999' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'INVALID_CREDENTIALS');
  });

  // 4. Account Not Found Authentication
  test('4. POST /api/tools/authenticate - should reject non-existent account', async () => {
    const res = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '999999', pin: '1234' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'INVALID_CREDENTIALS');
  });

  // 5. Balance Lookup with Authenticated Session Token
  test('5. POST /api/tools/balance - should return balance using sessionToken in Authorization header', async () => {
    const authRes = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100001', pin: '1234' });

    const token = authRes.body.sessionToken;

    const res = await request(app)
      .post('/api/tools/balance')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.balance, 25000);
    assert.equal(res.body.currency, 'INR');
  });

  // 5b. Balance Lookup with sessionToken in request body (for tool-calling convenience)
  test('5b. POST /api/tools/balance - should accept sessionToken in request body', async () => {
    const authRes = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100002', pin: '5678' });

    const token = authRes.body.sessionToken;

    const res = await request(app)
      .post('/api/tools/balance')
      .send({ sessionToken: token });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.balance, 78500);
    assert.equal(res.body.currency, 'INR');
  });

  // 6. Balance Lookup - Unauthorized without Session Token
  test('6. POST /api/tools/balance - should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/tools/balance')
      .send({});

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'UNAUTHORIZED');
  });

  // 6b. Balance Lookup - Invalid / Tampered Session Token
  test('6b. POST /api/tools/balance - should reject invalid session token', async () => {
    const res = await request(app)
      .post('/api/tools/balance')
      .set('Authorization', 'Bearer invalid.tampered.token')
      .send({});

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'INVALID_SESSION_TOKEN');
  });

  // 7. Successful Card Block with Session Token (Atomic Transaction)
  test('7. POST /api/tools/block-card - should block card, create ticket & update account state atomically', async () => {
    const authRes = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100001', pin: '1234' });

    const token = authRes.body.sessionToken;
    const userId = authRes.body.user.userId;

    const res = await request(app)
      .post('/api/tools/block-card')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cardLast4: '4821',
        reason: 'stolen while traveling',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.cardBlocked, true);
    assert.match(res.body.ticketNumber, /^CARD-BLK-[A-F0-9]{6}$/);

    // Verify card in DB is BLOCKED
    const card = await Card.findOne({ last4: '4821' });
    assert.equal(card.status, 'BLOCKED');
    assert.equal(card.blockReason, 'stolen while traveling');
    assert.ok(card.blockedAt);

    // Verify ticket in DB
    const ticket = await Ticket.findOne({ ticketNumber: res.body.ticketNumber });
    assert.ok(ticket);
    assert.equal(ticket.accountId.toString(), userId);
    assert.equal(ticket.status, 'SUCCESS');

    // Verify account lastAction updated
    const updatedAccount = await Account.findById(userId);
    assert.equal(updatedAccount.lastAction, 'CARD_BLOCK');
    assert.equal(updatedAccount.lastTicketNumber, res.body.ticketNumber);
  });

  // 8. Card Already Blocked
  test('8. POST /api/tools/block-card - should return 400 if card is already blocked', async () => {
    const authRes = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100003', pin: '9012' });

    const token = authRes.body.sessionToken;

    // Card 7722 was seeded as BLOCKED
    const res = await request(app)
      .post('/api/tools/block-card')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cardLast4: '7722',
        reason: 'lost',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'CARD_ALREADY_BLOCKED');
  });

  // 9. Card Belonging to Another Account
  test('9. POST /api/tools/block-card - should prevent authenticated user from blocking another customer card', async () => {
    // Authenticate as Account 100001 (Rahul)
    const authRes = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100001', pin: '1234' });

    const token = authRes.body.sessionToken;

    // Attempt to block card 9102 which belongs to Account 100002 (Priya)
    const res = await request(app)
      .post('/api/tools/block-card')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cardLast4: '9102',
        reason: 'fraud',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'UNAUTHORIZED_CARD_ACCESS');
  });

  // 10. Update User Data - Whitelisted Fields
  test('10. POST /api/tools/update-user - should update allowed whitelisted fields using session token', async () => {
    const authRes = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100001', pin: '1234' });

    const token = authRes.body.sessionToken;
    const userId = authRes.body.user.userId;

    const res = await request(app)
      .post('/api/tools/update-user')
      .set('Authorization', `Bearer ${token}`)
      .send({
        data: {
          lastAction: 'CARD_BLOCK',
          lastTicketNumber: 'CARD-BLK-TEST99',
          phone: '+919999988888',
        },
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.updatedFields.lastAction, 'CARD_BLOCK');

    const updatedAccount = await Account.findById(userId);
    assert.equal(updatedAccount.lastAction, 'CARD_BLOCK');
    assert.equal(updatedAccount.phone, '+919999988888');
  });

  // 11. Update User Data - Reject Sensitive Fields
  test('11. POST /api/tools/update-user - should reject modification of sensitive fields (balance, PIN, accountNumber)', async () => {
    const authRes = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100001', pin: '1234' });

    const token = authRes.body.sessionToken;
    const userId = authRes.body.user.userId;

    const res = await request(app)
      .post('/api/tools/update-user')
      .set('Authorization', `Bearer ${token}`)
      .send({
        data: {
          balance: 999999,
          pin: '0000',
        },
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'UNAUTHORIZED_FIELD_UPDATE');

    // Confirm DB balance was not modified
    const untouched = await Account.findById(userId);
    assert.equal(untouched.balance, 25000);
  });

  // 12. Send Confirmation Email
  test('12. POST /api/tools/send-confirmation-email - should send confirmation email for valid ticket and authenticated caller', async () => {
    const authRes = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100001', pin: '1234' });

    const token = authRes.body.sessionToken;

    // Block card first to generate a real ticket
    const blockRes = await request(app)
      .post('/api/tools/block-card')
      .set('Authorization', `Bearer ${token}`)
      .send({ cardLast4: '4821', reason: 'stolen' });

    const ticketNumber = blockRes.body.ticketNumber;

    const emailRes = await request(app)
      .post('/api/tools/send-confirmation-email')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticketNumber });

    assert.equal(emailRes.status, 200);
    assert.equal(emailRes.body.success, true);
    assert.equal(emailRes.body.emailSent, true);
  });

  // 13. Send Confirmation Email - Unauthorized Ticket
  test('13. POST /api/tools/send-confirmation-email - should reject email request for ticket belonging to another customer', async () => {
    // 1. Account 1 blocks card
    const auth1 = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100001', pin: '1234' });

    const blockRes = await request(app)
      .post('/api/tools/block-card')
      .set('Authorization', `Bearer ${auth1.body.sessionToken}`)
      .send({ cardLast4: '4821', reason: 'stolen' });

    const ticketNumber = blockRes.body.ticketNumber;

    // 2. Account 2 logs in and tries to send email with Account 1's ticket
    const auth2 = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100002', pin: '5678' });

    const res = await request(app)
      .post('/api/tools/send-confirmation-email')
      .set('Authorization', `Bearer ${auth2.body.sessionToken}`)
      .send({ ticketNumber });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'UNAUTHORIZED_TICKET_ACCESS');
  });

  // 14. Validation Edge Cases
  test('14. Validation Middleware - should reject malformed payload & invalid types', async () => {
    // Missing PIN
    const res1 = await request(app)
      .post('/api/tools/authenticate')
      .send({ accountNumber: '100001' });
    assert.equal(res1.status, 400);
    assert.equal(res1.body.error, 'INVALID_INPUT');

    // Invalid Route
    const res2 = await request(app).get('/api/tools/nonexistent');
    assert.equal(res2.status, 404);
    assert.equal(res2.body.error, 'NOT_FOUND');
  });
});
