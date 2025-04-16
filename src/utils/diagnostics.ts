import mongoose from 'mongoose';
import config from '../config';
import logger from './logger';
import { User } from '../db/models/User';
import { initVybeApi } from '../modules/vybeApi';

/**
 * Run diagnostic checks on the application
 * - Check environment variables
 * - Test database connection
 * - Verify Vybe API initialization
 */
export const runDiagnostics = async (): Promise<void> => {
  logger.info('Running system diagnostics...');
  
  // Check environment variables
  checkEnvironmentVariables();
  
  // Test database connection
  await testDatabaseConnection();
  
  // Test Vybe API
  testVybeApi();
  
  logger.info('Diagnostics completed');
};

/**
 * Check if all required environment variables are set
 */
const checkEnvironmentVariables = (): void => {
  logger.info('Checking environment variables...');
  
  const requiredVars = ['BOT_TOKEN', 'MONGO_URI', 'VYBE_API_KEY'];
  const missingVars: string[] = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables', { missingVars });
  } else {
    logger.info('All required environment variables are set');
    
    // Log masked values for verification
    logger.debug('Environment variable details', {
      BOT_TOKEN_LENGTH: process.env.BOT_TOKEN?.length,
      BOT_TOKEN_PREFIX: process.env.BOT_TOKEN?.substring(0, 4) + '...',
      MONGO_URI_MASKED: process.env.MONGO_URI?.replace(
        /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/,
        'mongodb$1://$2:****@'
      ),
      VYBE_API_KEY_LENGTH: process.env.VYBE_API_KEY?.length,
      VYBE_API_KEY_PREFIX: process.env.VYBE_API_KEY?.substring(0, 4) + '...',
      LOG_LEVEL: process.env.LOG_LEVEL || 'default (info)',
      NODE_ENV: process.env.NODE_ENV || 'default (development)'
    });
  }
};

/**
 * Test the database connection and basic operations
 */
const testDatabaseConnection = async (): Promise<void> => {
  logger.info('Testing database connection...');
  
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info('MongoDB is already connected');
    } else {
      // Configure Mongoose
      mongoose.set('strictQuery', true);
      
      // Connect to MongoDB
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      });
      
      logger.info('Successfully connected to MongoDB for diagnostics');
    }
    
    // Test User model
    logger.debug('Testing User model...', {
      modelName: User.modelName,
      collectionName: User.collection.name
    });
    
    // Count users
    const userCount = await User.countDocuments();
    logger.info('User collection check successful', { userCount });
    
    // If not already connected (we connected for diagnostics), disconnect
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('Closed diagnostic database connection');
    }
  } catch (error: any) {
    logger.error('Database connection test failed', { 
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
  }
};

/**
 * Test the Vybe API initialization
 */
const testVybeApi = (): void => {
  logger.info('Testing Vybe API initialization...');
  
  try {
    // Try to initialize the API
    initVybeApi();
    logger.info('Vybe API initialization successful');
  } catch (error: any) {
    logger.error('Vybe API initialization failed', { 
      error: error.message,
      stack: error.stack,
      name: error.name
    });
  }
};

// Export for direct execution
export default runDiagnostics;