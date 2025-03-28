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
    
    // Configure Mongoose
    mongoose.set('strictQuery', true);
    
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    
    logger.info('Connected to MongoDB successfully');
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
export { mongoose };
