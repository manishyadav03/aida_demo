const mongoose = require('mongoose');

/**
 * Connect to MongoDB database instance.
 * @param {string} [uri] - Optional MongoDB URI (defaults to process.env.MONGODB_URI)
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB(uri) {
  const dbUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/aida_banking';

  try {
    const conn = await mongoose.connect(dbUri);
    console.log(`[Database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database] Connection error: ${error.message}`);
    throw error;
  }
}

/**
 * Disconnect from MongoDB database instance.
 * @returns {Promise<void>}
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected cleanly');
  } catch (error) {
    console.error(`[Database] Disconnect error: ${error.message}`);
  }
}

module.exports = {
  connectDB,
  disconnectDB,
};
