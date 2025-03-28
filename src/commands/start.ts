import { Telegraf, Context } from 'telegraf';
import { Markup } from 'telegraf';
import logger from '../utils/logger';

/**
 * Registers the /start command with the bot
 * @param bot Telegraf bot instance
 */
export const registerStartCommand = (bot: Telegraf<Context>): void => {
  bot.command('start', async (ctx) => {
    try {
      logger.debug('Received /start command', { from: ctx.from?.id });
      
      // Welcome message
      const welcomeMessage = `
<b>👋 Welcome to the Solana Research Bot!</b>

This bot provides real-time and historical Solana research, analytics, and notifications.

Use the buttons below to navigate:
`;
      
      // Main menu keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💼 Wallet Management', 'wallet'),
          Markup.button.callback('🔍 Research', 'research')
        ],
        [
          Markup.button.callback('🚨 Alerts', 'alerts'),
          Markup.button.callback('❓ Help', 'help')
        ]
      ]);
      
      // Send welcome message with keyboard
      await ctx.reply(welcomeMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Sent welcome message', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in /start command', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle main menu button clicks - directly execute functionality instead of suggesting commands
  bot.action('wallet', async (ctx) => {
    try {
      ctx.answerCbQuery();
      logger.debug('Received wallet button click', { from: ctx.from?.id });
      
      // Wallet management message - directly showing wallet management options
      const walletMessage = `
<b>💼 Wallet Management</b>

You can add, remove, or list your Solana wallet addresses.

Select an option:
`;
      
      // Wallet management keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('➕ Add Wallet', 'wallet_add'),
          Markup.button.callback('➖ Remove Wallet', 'wallet_remove')
        ],
        [
          Markup.button.callback('📋 List Wallets', 'wallet_list'),
          Markup.button.callback('🔙 Back to Main Menu', 'back_to_main')
        ]
      ]);
      
      // Send wallet management message with keyboard
      await ctx.reply(walletMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Sent wallet management message', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in wallet button action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  bot.action('research', async (ctx) => {
    try {
      ctx.answerCbQuery();
      logger.debug('Received research button click', { from: ctx.from?.id });
      
      // Research message - directly showing research options
      const researchMessage = `
<b>🔍 Solana Research</b>

Access various research tools for Solana data.

Select an option:
`;
      
      // Research keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💼 Wallet Analysis', 'research_wallet'),
          Markup.button.callback('🪙 Token Deep Dive', 'research_token')
        ],
        [
          Markup.button.callback('📊 Market Data', 'research_market'),
          Markup.button.callback('🏛 Protocol Health', 'research_protocol')
        ],
        [
          Markup.button.callback('🔙 Back to Main Menu', 'back_to_main')
        ]
      ]);
      
      // Send research message with keyboard
      await ctx.reply(researchMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Sent research message', { to: ctx.from?.id });
    } catch (error) {
      logger.error('Error in research button action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  bot.action('alerts', async (ctx) => {
    try {
      ctx.answerCbQuery();
      logger.debug('Received alerts button click', { from: ctx.from?.id });
      
      // Alerts message - directly showing alerts management options
      const alertsMessage = `
<b>🚨 Alerts Management</b>

You can create, list, or delete alerts for price changes, balance thresholds, TVL changes, and active user counts.

Select an option:
`;
      
      // Alerts keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('➕ Create Alert', 'alert_create'),
          Markup.button.callback('📋 List Alerts', 'alert_list')
        ],
        [
          Markup.button.callback('➖ Delete Alert', 'alert_delete'),
          Markup.button.callback('🔙 Back to Main Menu', 'back_to_main')
        ]
      ]);
      
      // Send alerts message with keyboard
      await ctx.reply(alertsMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Sent alerts message', { to: ctx.from?.id });
    } catch (error) {
      logger.error('Error in alerts button action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  bot.action('help', async (ctx) => {
    try {
      ctx.answerCbQuery();
      logger.debug('Received help button click', { from: ctx.from?.id });
      
      // Help message - directly showing help information
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
      logger.error('Error in help button action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle back to main menu action
  bot.action('back_to_main', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      // Re-send the start command welcome message and keyboard
      const welcomeMessage = `
<b>👋 Welcome to the Solana Research Bot!</b>

This bot provides real-time and historical Solana research, analytics, and notifications.

Use the buttons below to navigate:
`;
      
      // Main menu keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💼 Wallet Management', 'wallet'),
          Markup.button.callback('🔍 Research', 'research')
        ],
        [
          Markup.button.callback('🚨 Alerts', 'alerts'),
          Markup.button.callback('❓ Help', 'help')
        ]
      ]);
      
      // Send welcome message with keyboard
      await ctx.reply(welcomeMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Sent main menu message', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in back_to_main action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  logger.info('Registered /start command');
};
