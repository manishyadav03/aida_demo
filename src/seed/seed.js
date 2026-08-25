require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const Account = require('../models/Account');
const Card = require('../models/Card');
const Ticket = require('../models/Ticket');

const seedCustomers = [
  {
    accountNumber: '100001',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    phone: '+919876543210',
    pin: '1234', // Pre-save hook will hash this via bcrypt
    balance: 25000,
    cards: [
      {
        last4: '4821',
        status: 'ACTIVE',
      },
    ],
  },
  {
    accountNumber: '100002',
    name: 'Priya Singh',
    email: 'priya.singh@example.com',
    phone: '+919876543211',
    pin: '5678',
    balance: 78500,
    cards: [
      {
        last4: '9102',
        status: 'ACTIVE',
      },
    ],
  },
  {
    accountNumber: '100003',
    name: 'Amit Kumar',
    email: 'amit.kumar@example.com',
    phone: '+919876543212',
    pin: '9012',
    balance: 12450,
    cards: [
      {
        last4: '3341',
        status: 'ACTIVE',
      },
      {
        last4: '7722',
        status: 'BLOCKED',
        blockedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        blockReason: 'Reported lost previously',
      },
    ],
  },
];

/**
 * Seed the database with fake banking demo accounts, cards, and tickets.
 */
async function seedDatabase(customUri) {
  try {
    await connectDB(customUri);
    console.log('[Seed] Resetting database collections for idempotency...');

    // Clear existing collections
    await Promise.all([
      Account.deleteMany({}),
      Card.deleteMany({}),
      Ticket.deleteMany({}),
    ]);

    console.log('[Seed] Seeding customer accounts and linked cards...');

    for (const customerData of seedCustomers) {
      const { cards, ...accountFields } = customerData;

      // Create Account (Mongoose pre-save hook will hash the PIN)
      const account = await Account.create(accountFields);

      // Create linked Cards
      for (const cardData of cards) {
        await Card.create({
          ...cardData,
          accountId: account._id,
        });
      }

      console.log(`  -> Seeded Account: ${account.accountNumber} (${account.name}) with ${cards.length} card(s)`);
    }

    console.log('[Seed] Database seeding completed successfully!');
  } catch (error) {
    console.error(`[Seed Error]: ${error.message}`);
    throw error;
  } finally {
    if (!customUri) {
      await disconnectDB();
    }
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedDatabase, seedCustomers };
