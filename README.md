# AIDA Voice Banking Assistant - Backend & Integration Guide

A production-grade, layered Node.js/Express REST API and tool service designed to power a Voice Banking Assistant on the **Enterprise Bot AIDA** conversational AI platform.

---

## 1. System Architecture & End-to-End Flow

```
                      🎙 Customer (Voice Call)
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │         Enterprise Bot AIDA Platform         │
         │   - Realtime Audio / Speech-To-Text (STT)    │
         │   - LLM Agent (Gemini Live / GPT-4o-mini)    │
         │   - Text-To-Speech (TTS) Voice Synthesis     │
         └──────────────────────┬───────────────────────┘
                                │
                  Agentic Tool Calls (HTTPS)
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │           Secure ngrok Public Tunnel         │
         │  https://<tunnel-subdomain>.ngrok-free.dev   │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼ Forwarded to localhost:5000
         ┌──────────────────────────────────────────────┐
         │         Node.js + Express Backend            │
         │                                              │
         │  [Middleware Layer]                          │
         │  - Helmet & CORS                             │
         │  - Morgan HTTP Logging                       │
         │  - Express Rate Limiting                     │
         │  - JWT SessionToken Authentication           │
         │  - Input Validation & Sanitization           │
         │                                              │
         │  [Controllers Layer]                         │
         │  - Thin HTTP handlers                        │
         │                                              │
         │  [Services Layer (Business Logic)]           │
         │  - AuthService (bcrypt PIN verify)           │
         │  - BalanceService (INR currency retrieval)   │
         │  - CardService (MongoDB Multi-Doc Tx)        │
         │  - UserService (Strict Field Whitelist)      │
         │  - TicketService (Ref ID generator)          │
         │  - EmailService (Resend Integration)         │
         └───────────────┬──────────────────────┬───────┘
                         │                      │
                  ACID Transactions        Out-of-band
                         │                  Email
                         ▼                      ▼
         ┌──────────────────────────────┐ ┌─────────────┐
         │        MongoDB Atlas         │ │ Resend API  │
         │  - accounts (hashed PIN)     │ │ (Card Block │
         │  - cards (ACTIVE / BLOCKED)  │ │  Confirm)   │
         │  - tickets (CARD_BLOCK)      │ └─────────────┘
         └──────────────────────────────┘
```

---

## 2. Tech Stack

- **Runtime**: Node.js (>=18.x)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM (MongoDB Atlas & Local supported)
- **Security & Libraries**:
  - `jsonwebtoken`: Short-lived session token management (15-minute default).
  - `bcryptjs`: Salted hashing for customer PINs (10 rounds).
  - `helmet`: Security HTTP headers.
  - `cors`: Cross-Origin Resource Sharing.
  - `express-rate-limit`: Rate limiting on sensitive endpoints.
  - `crypto` (native): Unique ticket reference generation (`CARD-BLK-XXXXXX`).
- **Email Notification**: Resend API (`resend`).
- **Testing**: Node.js Native Test Runner (`node:test`) + `supertest` + `mongodb-memory-server`.
- **Tunneling**: `ngrok` for exposing local backend to cloud AIDA platform.

---

## 3. Project Directory Structure

```
aida_demo/
├── .env.example                          # Environment variable configuration template
├── .env                                  # Local / Production environment secrets (gitignored)
├── .gitignore                            # Excludes node_modules, .env, and logs
├── package.json                          # Manifest, scripts, and dependencies
├── README.md                             # Comprehensive documentation & setup guide
├── postman_collection.json               # Ready-to-import Postman collection with dynamic token chaining
├── aida_tools_schema.json                # JSON Schema declarations for AIDA tool registry
├── src/
│   ├── app.js                            # Express app configuration & middleware pipeline
│   ├── server.js                         # Application bootstrap & graceful shutdown
│   ├── config/
│   │   └── db.js                         # Mongoose connection lifecycle manager
│   ├── controllers/
│   │   └── tool.controller.js            # Thin controllers delegating to domain services
│   ├── middleware/
│   │   ├── auth.middleware.js            # JWT sessionToken verification middleware
│   │   ├── error.middleware.js           # Centralized JSON error formatting & 404 handler
│   │   ├── rateLimiter.middleware.js     # Rate limiters for auth and API endpoints
│   │   └── validation.middleware.js      # Input validators and sanitizers (nested & flat support)
│   ├── models/
│   │   ├── Account.js                    # Account schema with salted bcrypt PIN hashing
│   │   ├── Card.js                       # Card schema (ACTIVE/BLOCKED, timestamps, reason)
│   │   └── Ticket.js                     # Ticket schema (CARD_BLOCK, SUCCESS/FAILED)
│   ├── routes/
│   │   └── tool.routes.js                # /api/tools/* and /health route definitions
│   ├── services/
│   │   ├── auth.service.js               # PIN verification & sessionToken generation
│   │   ├── balance.service.js            # Balance lookup service
│   │   ├── card.service.js               # MongoDB transaction-wrapped card block & ticket creation
│   │   ├── email.service.js              # Resend email dispatcher with explicit error handling
│   │   ├── ticket.service.js             # Ticket generator & database persistence
│   │   └── user.service.js               # Whitelisted profile metadata updates
│   ├── utils/
│   │   ├── jwt.js                        # JWT signing and verification helpers
│   │   ├── response.js                   # Standardized response formatters & AppError class
│   │   └── ticket.js                     # Unique ticket reference generator (CARD-BLK-XXXXXX)
│   ├── seed/
│   │   └── seed.js                       # Idempotent seed script with 3 fake customer accounts
│   └── scripts/
│       └── demo.js                       # Interactive CLI multi-turn voice banking simulation
└── tests/
    └── tool.test.js                      # 16-point automated integration test suite
```

---

## 4. Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection (Local or MongoDB Atlas)
MONGODB_URI=mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER>.mongodb.net/aida_banking?retryWrites=true&w=majority

# JWT Session Security
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=15m

# Resend Email Configuration (Optional in test/demo, required for live emails)
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=Voice Banking <onboarding@resend.dev>

# Security & CORS
CORS_ORIGIN=*
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
```

---

## 5. Seed Customer Accounts (Demo Data)

Run the idempotent database seeder:

```bash
npm run seed
```

This creates 3 distinct accounts with different balances and card statuses to prove dynamic database lookup:

| Account Number | Customer Name | Demo PIN | Balance | Cards | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `100001` | Rahul Sharma | `1234` | ₹25,000 | `4821` | ACTIVE |
| `100002` | Priya Singh | `5678` | ₹78,500 | `9102` | ACTIVE |
| `100003` | Amit Kumar | `9012` | ₹12,450 | `3341`, `7722` | `3341` (ACTIVE), `7722` (BLOCKED) |

---

## 6. How to Run Locally & Tunnel with ngrok

### Step 1: Start the Backend Server
```bash
npm install
npm run seed
npm run dev
```
Server runs on `http://localhost:5000`.

### Step 2: Start ngrok Tunnel
In a separate terminal, expose port 5000:
```bash
npx ngrok http 5000
```
ngrok will provide a public forwarding URL (e.g. `https://xxxx-xxxx.ngrok-free.dev`).

---

## 7. AIDA Toolset Configuration (5 Core Tools)

Register the following 5 tools in the **`Tools`** tab of your Enterprise Bot AIDA dashboard:

### 1. `manish_authenticate_customer`
* **Type**: `API Tool`
* **URL**: `https://<YOUR-NGROK-URL>/api/tools/authenticate`
* **Method**: `POST`
* **Response Type**: `JSON`
* **Headers**: `Content-Type: application/json`
* **Parameters**:
  * `accountNumber` (String, Required: Yes)
  * `pin` (String, Required: Yes)

### 2. `manish_get_account_balance`
* **Type**: `API Tool`
* **URL**: `https://<YOUR-NGROK-URL>/api/tools/balance`
* **Method**: `POST`
* **Response Type**: `JSON`
* **Headers**: `Content-Type: application/json`
* **Parameters**:
  * `sessionToken` (String, Required: Yes)

### 3. `manish_block_customer_card`
* **Type**: `API Tool`
* **URL**: `https://<YOUR-NGROK-URL>/api/tools/block-card`
* **Method**: `POST`
* **Response Type**: `JSON`
* **Headers**: `Content-Type: application/json`
* **Parameters**:
  * `sessionToken` (String, Required: Yes)
  * `cardLast4` (String, Required: Yes)
  * `reason` (String, Required: Yes)

### 4. `manish_update_user_action_data`
* **Type**: `API Tool`
* **URL**: `https://<YOUR-NGROK-URL>/api/tools/update-user`
* **Method**: `POST`
* **Response Type**: `JSON`
* **Headers**: `Content-Type: application/json`
* **Parameters**:
  * `sessionToken` (String, Required: Yes)
  * `lastAction` (String, Required: Yes)
  * `lastTicketNumber` (String, Required: Yes)

### 5. `manish_send_confirmation_email`
* **Type**: `API Tool`
* **URL**: `https://<YOUR-NGROK-URL>/api/tools/send-confirmation-email`
* **Method**: `POST`
* **Response Type**: `JSON`
* **Headers**: `Content-Type: application/json`
* **Parameters**:
  * `sessionToken` (String, Required: Yes)
  * `ticketNumber` (String, Required: Yes)

---

## 8. AIDA Agent System Prompt

Paste the following instructions into the **Prompt / System Instructions** of your Realtime Voice Agent:

```text
You are Manish Voice Banking Assistant, an AI voice banking agent representing Enterprise Bank. Your role is to assist customers with checking their account balance, blocking lost or stolen debit cards, and sending email confirmations.

SECURITY & AUTHENTICATION RULES:
1. You MUST authenticate the customer BEFORE revealing any account balance or blocking a card.
2. When the customer asks for their balance or to block a card and is not yet authenticated, ask:
   "I can certainly help you with that. For your security, please provide your Account Number and 4-digit PIN."
3. Once the customer provides their Account Number and PIN, invoke the tool `manish_authenticate_customer` with { accountNumber, pin }.
4. Store the returned `sessionToken` and customer name in memory. You MUST supply this `sessionToken` to all subsequent tool calls.
5. NEVER repeat, reveal, or log the customer's PIN.
6. If authentication fails, politely inform the customer and allow them to re-try their credentials.

BANKING OPERATIONS:
1. Balance Inquiry:
   - Call `manish_get_account_balance` passing { sessionToken }.
   - Announce their current balance clearly in Rupees (e.g., "Your current account balance is 25,000 Rupees.").

2. Card Blocking:
   - Ask for the last 4 digits of the card and the reason (e.g., stolen or lost).
   - Call `manish_block_customer_card` with { sessionToken, cardLast4, reason }.
   - Verbally read back the reference ticket number clearly (e.g., "Your card has been blocked. Your reference ticket number is CARD-BLK-...").
   - Call `manish_update_user_action_data` with { sessionToken, lastAction: "CARD_BLOCK", lastTicketNumber: ticketNumber }.

3. Email Confirmation:
   - Ask the customer if they would like an email confirmation sent to their registered email address.
   - If they agree, call `manish_send_confirmation_email` with { sessionToken, ticketNumber }.
   - Confirm verbally that the email has been sent.

VOICE CONVERSATION STYLE:
- Speak in a warm, polite, professional, and natural tone suitable for voice phone calls.
- Keep your sentences concise so the caller is never overwhelmed with long explanations.
- Never output markdown syntax, code snippets, or raw JSON in your spoken responses.
```

---

## 9. Automated Testing

Run the test suite covering **16 comprehensive integration scenarios**:

```bash
npm test
```

### Verified Test Cases:
1. `GET /health` - API operational status
2. `POST /authenticate` - Valid account + PIN returns `sessionToken` & `user` (excludes balance and PIN)
3. `POST /authenticate` - Wrong PIN rejected (401 `INVALID_CREDENTIALS`)
4. `POST /authenticate` - Non-existent account rejected (401 `INVALID_CREDENTIALS`)
5. `POST /balance` - Balance lookup via `sessionToken` in `Authorization` header
6. `POST /balance` - Balance lookup via `sessionToken` in request body
7. `POST /balance` - Rejection of unauthenticated requests (401 `UNAUTHORIZED`)
8. `POST /balance` - Rejection of invalid/tampered session tokens (401 `INVALID_SESSION_TOKEN`)
9. `POST /block-card` - Atomic card blocking, ticket generation & account history update
10. `POST /block-card` - Preventing re-blocking an already blocked card (400 `CARD_ALREADY_BLOCKED`)
11. `POST /block-card` - Preventing blocking cards belonging to other accounts (403 `UNAUTHORIZED_CARD_ACCESS`)
12. `POST /update-user` - Updating whitelisted profile fields using `sessionToken`
13. `POST /update-user` - Rejecting modification of sensitive fields (`balance`, `pin`, `accountNumber`)
14. `POST /send-confirmation-email` - Sending confirmation email for valid ticket
15. `POST /send-confirmation-email` - Rejecting email request for ticket belonging to another customer
16. Validation Middleware - Rejection of malformed payloads and invalid types

---

## 10. Security Highlights

- **Session-Based Authentication**: Sensitive endpoints do not trust caller-supplied user IDs; identity is derived strictly from the cryptographic signature of the verified `sessionToken`.
- **PIN Hashing**: PINs are hashed using salted `bcryptjs` (10 rounds) and excluded by default at schema level (`select: false`).
- **MongoDB Multi-Document Transactions**: Ensures ACID compliance across card blocking, ticket generation, and account metadata updates.
- **Decoupled Notifications**: Email dispatching happens strictly **after** database transactions commit; an email failure does not rollback a successful card block.
- **Strict Field Whitelisting**: Profile updates block any attempt to modify `balance`, `pin`, or `accountNumber`.
- **Rate Limiting & Security Headers**: `helmet` headers, CORS policies, and rate-limiting protect against brute-force and scraping.