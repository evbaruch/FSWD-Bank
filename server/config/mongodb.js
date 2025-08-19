const mongoose = require('mongoose');
require('dotenv').config();

const connectMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fswd_bank';
    
    await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    console.log('[DATABASE] MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      console.error('[DATABASE] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[DATABASE] MongoDB disconnected');
    });

  } catch (error) {
    console.error('[DATABASE] MongoDB connection failed:', error);
    process.exit(1);
  }
};

const closeMongoDBConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log('[DATABASE] MongoDB connection closed');
  } catch (error) {
    console.error('[ERROR] Error closing MongoDB connection:', error);
  }
};

module.exports = {
  connectMongoDB,
  closeMongoDBConnection
}; 