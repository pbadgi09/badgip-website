/**
 * Database Configuration
 * MongoDB connection setup with Mongoose
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * Supports both local and cloud MongoDB instances
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`📚 MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('📚 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // In development, we might want to continue without DB
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Continuing without database in development mode');
      return;
    }
    
    // In production, exit if database connection fails
    process.exit(1);
  }
};

module.exports = connectDB;