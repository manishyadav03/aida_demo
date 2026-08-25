const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'demo_secret_key_aida_banking';

const app = require('../app');
const { seedDatabase } = require('../seed/seed');

async function runLiveVoiceBankingDemo() {
  console.log('===============================================================');
  console.log('🚀 AIDA VOICE BANKING ASSISTANT - LIVE CONVERSATION DEMO');
  console.log('===============================================================\n');

  // Spin up in-memory MongoDB for clean standalone demo execution
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await seedDatabase(uri);

  console.log('\n--- SIMULATING VOICE AGENT CONVERSATION FLOW ---\n');

  // Step 1: Health Check
  console.log('🤖 Step 1: Agent checks backend health...');
  const healthRes = await request(app).get('/health');
  console.log('   Response:', JSON.stringify(healthRes.body), '\n');

  // Step 2: Customer calls voice agent and provides Account Number + PIN
  console.log('👤 Customer: "Hi, I need to check my balance and report my card as stolen."');
  console.log('🤖 Agent: "Sure! Please provide your Account Number and PIN."');
  console.log('👤 Customer: "My account number is 100001 and PIN is 1234."');
  console.log('🤖 Agent calls tool: POST /api/tools/authenticate');

  const authRes = await request(app)
    .post('/api/tools/authenticate')
    .send({ accountNumber: '100001', pin: '1234' });

  console.log('   Response:', JSON.stringify(authRes.body));
  const sessionToken = authRes.body.sessionToken;
  const userName = authRes.body.user.name;
  console.log(`   [Agent Session State: authenticated=true, caller="${userName}", token="...${sessionToken.slice(-15)}"]\n`);

  // Step 3: Fetch Balance (Secured with sessionToken)
  console.log('👤 Customer: "First, what is my current balance?"');
  console.log('🤖 Agent calls tool: POST /api/tools/balance (using sessionToken)');

  const balanceRes = await request(app)
    .post('/api/tools/balance')
    .set('Authorization', `Bearer ${sessionToken}`)
    .send({});

  console.log('   Response:', JSON.stringify(balanceRes.body));
  console.log(`🤖 Agent: "Your current account balance is ₹${balanceRes.body.balance.toLocaleString('en-IN')}."\n`);

  // Step 4: Block Card (Atomic Transaction)
  console.log('👤 Customer: "Please block my debit card ending in 4821. It was stolen while traveling."');
  console.log('🤖 Agent calls tool: POST /api/tools/block-card (using sessionToken)');

  const blockRes = await request(app)
    .post('/api/tools/block-card')
    .set('Authorization', `Bearer ${sessionToken}`)
    .send({
      cardLast4: '4821',
      reason: 'stolen while traveling',
    });

  console.log('   Response:', JSON.stringify(blockRes.body));
  const ticketNumber = blockRes.body.ticketNumber;
  console.log(`🤖 Agent: "Your card ending in 4821 has been blocked. Your reference ticket number is ${ticketNumber}."\n`);

  // Step 5: Send Confirmation Email
  console.log('👤 Customer: "Can you send me an email confirmation for this?"');
  console.log('🤖 Agent calls tool: POST /api/tools/send-confirmation-email (using sessionToken)');

  const emailRes = await request(app)
    .post('/api/tools/send-confirmation-email')
    .set('Authorization', `Bearer ${sessionToken}`)
    .send({
      ticketNumber,
    });

  console.log('   Response:', JSON.stringify(emailRes.body));
  console.log('🤖 Agent: "A confirmation email has been dispatched to your registered email address."\n');

  // Step 6: Demonstrate Security & Resilience
  console.log('--- TESTING RESILIENCE & SECURITY GUARDS ---\n');

  console.log('🔒 Test Guard 1: Attempt to re-block an already blocked card:');
  const duplicateBlockRes = await request(app)
    .post('/api/tools/block-card')
    .set('Authorization', `Bearer ${sessionToken}`)
    .send({ cardLast4: '4821', reason: 'lost' });
  console.log('   Response (HTTP ' + duplicateBlockRes.status + '):', JSON.stringify(duplicateBlockRes.body));

  console.log('\n🔒 Test Guard 2: Attempt to call balance WITHOUT sessionToken:');
  const unauthRes = await request(app)
    .post('/api/tools/balance')
    .send({});
  console.log('   Response (HTTP ' + unauthRes.status + '):', JSON.stringify(unauthRes.body));

  console.log('\n🔒 Test Guard 3: Attempt to update sensitive field (balance):');
  const maliciousUpdateRes = await request(app)
    .post('/api/tools/update-user')
    .set('Authorization', `Bearer ${sessionToken}`)
    .send({ data: { balance: 10000000 } });
  console.log('   Response (HTTP ' + maliciousUpdateRes.status + '):', JSON.stringify(maliciousUpdateRes.body));

  console.log('\n🔒 Test Guard 4: Attempt to block someone else\'s card:');
  const unauthorizedCardRes = await request(app)
    .post('/api/tools/block-card')
    .set('Authorization', `Bearer ${sessionToken}`)
    .send({ cardLast4: '9102', reason: 'fraud' });
  console.log('   Response (HTTP ' + unauthorizedCardRes.status + '):', JSON.stringify(unauthorizedCardRes.body));

  console.log('\n===============================================================');
  console.log('✅ ALL DEMO SCENARIOS COMPLETED SUCCESSFULLY!');
  console.log('===============================================================\n');

  await mongoose.disconnect();
  await mongoServer.stop();
  process.exit(0);
}

runLiveVoiceBankingDemo().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
