import { app } from './app';
import logger from './utils/logger';

/**
 * Entry point for the Solana Research Telegram Bot
 * - Initializes the bot from app.ts
 * - Handles process signals for graceful shutdown
 * - Starts the bot
 */

// Handle process signals for graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal, shutting down...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down...');
  await app.stop();
  process.exit(0);
});

// Start the bot
app.start()
  .then(() => {
    logger.info('Bot started successfully');
  })
  .catch((error: Error) => {
    logger.error('Failed to start bot', { error });
    process.exit(1);
  });
