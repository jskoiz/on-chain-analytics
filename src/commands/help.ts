import { Telegraf, Context } from 'telegraf';
import logger from '../utils/logger';

/**
 * Registers the /help command with the bot
 * @param bot Telegraf bot instance
 */
export const registerHelpCommand = (bot: Telegraf<Context>): void => {
  bot.command('help', async (ctx) => {
    try {
      logger.debug('Received /help command', { from: ctx.from?.id });
      
      // Help message
      const helpMessage = `
<b>📚 Solana Research Bot Help</b>

This bot provides real-time and historical Solana research, analytics, and notifications.

<b>Available Commands:</b>

/start - Show the main menu
/help - Show this help message
/wallet - Manage your Solana wallet addresses
/research - Access Solana research tools
/alerts - Manage your price and activity alerts

<b>Wallet Management:</b>
Use /wallet to add, remove, or list your Solana wallet addresses.

<b>Research:</b>
Use /research to access various research tools:
• Wallet Analysis - View token and NFT balances
• Token Deep Dive - Get detailed token information
• Market Data - View price and volume data
• Protocol Health - Check TVL and user activity

<b>Alerts:</b>
Use /alerts to create, list, or delete alerts for:
• Price changes
• Balance thresholds
• TVL changes
• Active user counts

For more information or support, contact @SolanaResearchBotSupport
`;
      
      // Send help message
      await ctx.reply(helpMessage, {
        parse_mode: 'HTML'
      });
      
      logger.debug('Sent help message', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in /help command', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  logger.info('Registered /help command');
};
