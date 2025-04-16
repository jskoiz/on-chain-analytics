import mongoose from 'mongoose';
import config from '../config';
import logger from '../utils/logger';

/**
 * Connects to MongoDB using the connection URI from environment variables
 * @returns A promise that resolves when the connection is established
 */
export const connectToDatabase = async (): Promise<void> => {
  try {
    logger.info('Connecting to MongoDB...');
    
    // Log connection URI (with sensitive parts masked)
    const maskedUri = config.mongoUri.replace(
      /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/,
      'mongodb$1://$2:****@'
    );
    logger.debug('MongoDB connection details', { 
      uri: maskedUri,
      mongooseVersion: mongoose.version
    });
    
    // Configure Mongoose
    mongoose.set('strictQuery', true);
    
    // Connect to MongoDB with additional options for better error reporting
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    
    // Log connection status and database information
    const dbName = mongoose.connection.name;
    
    // Check if db is available before trying to access it
    if (mongoose.connection.db) {
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        logger.info('Connected to MongoDB successfully', { 
          dbName,
          collectionsCount: collections.length,
          collectionNames: collections.map((c: any) => c.name)
        });
      } catch (err: any) {
        logger.info('Connected to MongoDB successfully, but could not list collections', {
          dbName,
          error: err.message
        });
      }
    } else {
      logger.info('Connected to MongoDB successfully', { 
        dbName,
        note: 'Connection established but db object not available yet'
      });
    }
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
};

/**
 * Closes the MongoDB connection
 * @returns A promise that resolves when the connection is closed
 */
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    logger.info('Closing MongoDB connection...');
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error });
    throw error;
  }
};

// Export mongoose for use in models
export { mongoose as mongooseInstance };
