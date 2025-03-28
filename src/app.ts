import { Telegraf } from 'telegraf';
import config from './config';
import { connectToDatabase, closeDatabaseConnection } from './db';
import { initVybeApi } from './modules/vybeApi';
import { registerCommands } from './commands';
import { AlertScheduler } from './services/alertScheduler';
import logger from './utils/logger';

// Create bot instance
const bot = new Telegraf(config.botToken);

// Create alert scheduler
const alertScheduler = new AlertScheduler(bot);

/**
 * App class to manage the bot lifecycle
 */
export class App {
  /**
   * Start the bot
   * - Connect to MongoDB
   * - Initialize Vybe API
   * - Set up middleware
   * - Register commands
   * - Start alert scheduler
   * - Launch the bot
   */
  async start(): Promise<void> {
    try {
      // Connect to MongoDB
      await connectToDatabase();
      
      // Initialize Vybe API
      initVybeApi();
      
      // Set up middleware
      this.setupMiddleware();
      
      // Register commands
      registerCommands(bot);
      
      // Start alert scheduler
      alertScheduler.start();
      
      // Launch the bot with dropPendingUpdates option to ignore old updates
      await bot.launch({
        dropPendingUpdates: true
      });
      logger.info('Bot is running');
    } catch (error: any) {
      logger.error('Failed to start the bot', { error });
      throw error;
    }
  }
  
  /**
   * Stop the bot
   * - Stop the bot
   * - Stop alert scheduler
   * - Close database connection
   */
  async stop(): Promise<void> {
    try {
      // Stop the bot
      bot.stop();
      
      // Stop alert scheduler
      alertScheduler.stop();
      
      // Close database connection
      await closeDatabaseConnection();
      
      logger.info('Bot stopped successfully');
    } catch (error: any) {
      logger.error('Error stopping the bot', { error });
      throw error;
    }
  }
  
  /**
   * Set up middleware
   * - Logging middleware
   * - Error handling middleware
   */
  private setupMiddleware(): void {
    // Logging middleware
    bot.use(async (ctx, next) => {
      const start = Date.now();
      
      logger.debug('Received update', {
        updateType: ctx.updateType,
        from: ctx.from?.id,
        messageText: ctx.message && 'text' in ctx.message ? ctx.message.text : undefined
      });
      
      await next();
      
      const ms = Date.now() - start;
      logger.debug(`Response time: ${ms}ms`);
    });
    
    // Error handling middleware
    bot.catch((err, ctx) => {
      // Check if it's a "query is too old" or "query ID is invalid" error
      if (typeof err === 'object' && err !== null && 'message' in err && 
          typeof err.message === 'string' && 
          (err.message.includes('query is too old') || err.message.includes('query ID is invalid'))) {
        logger.warn('Ignoring expired or invalid query', { 
          error: err.message, 
          updateType: ctx.updateType 
        });
        return; // Just ignore this error and don't crash
      }
      
      // For other errors, log and notify the user
      logger.error('Bot error', { error: err, updateType: ctx.updateType });
      
      // Send error message to user
      ctx.reply('An error occurred while processing your request. Please try again later.', {
        parse_mode: 'HTML'
      }).catch(e => {
        logger.error('Failed to send error message', { error: e });
      });
    });
  }
}

// Export bot instance and app
export const app = new App();
export { bot };
