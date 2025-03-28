import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable configuration with validation
 */
interface Config {
  // Bot configuration
  botToken: string;
  
  // Database configuration
  mongoUri: string;
  
  // API configuration
  vybeApiKey: string;
  
  // Logging configuration
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Node environment
  nodeEnv: 'development' | 'production' | 'test';
}

/**
 * Validates that required environment variables are present
 * @param name Environment variable name
 * @returns The environment variable value
 * @throws Error if the environment variable is not defined
 */
const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

/**
 * Configuration object with validated environment variables
 */
const config: Config = {
  // Bot configuration
  botToken: requireEnv('BOT_TOKEN'),
  
  // Database configuration
  mongoUri: requireEnv('MONGO_URI'),
  
  // API configuration
  vybeApiKey: requireEnv('VYBE_API_KEY'),
  
  // Logging configuration (with default)
  logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
  
  // Node environment (with default)
  nodeEnv: (process.env.NODE_ENV as Config['nodeEnv']) || 'development',
};

export default config;
