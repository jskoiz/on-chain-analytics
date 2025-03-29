import { Telegraf, Context } from 'telegraf';
import { Markup } from 'telegraf';
import { getWalletSummary } from '../modules/vybeApi';
import logger from '../utils/logger';

/**
 * Registers the /start command with the bot
 * @param bot Telegraf bot instance
 */
export const registerStartCommand = (bot: Telegraf<Context>): void => {
  bot.command('start', async (ctx) => {
    try {
      logger.debug('Received /start command', { from: ctx.from?.id });
      
      // Get user ID
      const userId = ctx.from?.id;
      
      // Import User model
      const User = require('../db/models/User').default;
      
      // Check if user exists and has wallets
      let walletInfo = null;
      let walletAddress = '';
      let solBalance = 0;
      let usdValue = 0;
      
      if (userId) {
        try {
          // Find user in database
          const user = await User.findOne({ telegramId: userId });
          
          if (user && user.wallets && user.wallets.length > 0) {
            // Get the first wallet address
            walletAddress = user.wallets[0]; // Use first wallet for display
            
            // Get wallet summary from Vybe API
            try {
              const walletSummary = await getWalletSummary(walletAddress);
              walletInfo = walletSummary;
              solBalance = walletSummary.solBalance;
              usdValue = walletSummary.totalUsdValue || 0;
            } catch (apiError) {
              logger.error('Failed to get wallet summary', { apiError, walletAddress });
            }
          }
        } catch (dbError) {
          logger.error('Error fetching user data', { dbError, userId });
        }
      }
      
      // Build welcome message based on wallet status
      let welcomeMessage = '';
      
      if (walletAddress && walletInfo) {
        // User has a wallet - show wallet info
        welcomeMessage = `
<b>Solana</b> · <i>ℹ️</i>
<code>${walletAddress}</code> <i>(Tap to copy)</i>
Balance: ${solBalance.toFixed(3)} SOL ($${usdValue.toFixed(2)})
—
Click on the Refresh button to update your current balance.

Join our Telegram group @SolanaResearchGroup and follow us on <a href="https://twitter.com/SolanaResearch">Twitter</a>!

💡 Use the buttons below to access all features:
`;
      } else {
        // No wallet - show standard welcome
        welcomeMessage = `
<b>👋 Welcome to the Solana Research Bot!</b>

This bot provides real-time and historical Solana research, analytics, and notifications.

To get started, add your Solana wallet address using the Wallet Management button.

Join our Telegram group @SolanaResearchGroup and follow us on <a href="https://twitter.com/SolanaResearch">Twitter</a>!

Use the buttons below to navigate:
`;
      }
      
      // Enhanced main menu keyboard with more options
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💼 Wallet Management', 'wallet'),
          Markup.button.callback('🔍 Research', 'research')
        ],
        [
          Markup.button.callback('🚨 Alerts', 'alerts'),
          Markup.button.callback('📊 Market Data', 'research_market')
        ],
        [
          Markup.button.callback('🪙 Token Analysis', 'research_token'),
          Markup.button.callback('🏛 Protocol Health', 'research_protocol')
        ],
        [
          Markup.button.callback('🔄 Refresh', 'refresh_data'),
          Markup.button.callback('⚙️ Settings', 'settings')
        ],
        [
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
  
  // Handle back to main menu action - directly show the main menu
  bot.action('back_to_main', async (ctx) => {
    try {
      ctx.answerCbQuery();
      logger.debug('Returning to main menu', { from: ctx.from?.id });
      
      // Get user ID
      const userId = ctx.from?.id;
      
      // Import User model
      const User = require('../db/models/User').default;
      
      // Check if user exists and has wallets
      let walletInfo = null;
      let walletAddress = '';
      let solBalance = 0;
      let usdValue = 0;
      
      if (userId) {
        try {
          // Find user in database
          const user = await User.findOne({ telegramId: userId });
          
          if (user && user.wallets && user.wallets.length > 0) {
            // Get the first wallet address
            walletAddress = user.wallets[0]; // Use first wallet for display
            
            // Get wallet summary from Vybe API
            try {
              const walletSummary = await getWalletSummary(walletAddress);
              walletInfo = walletSummary;
              solBalance = walletSummary.solBalance;
              usdValue = walletSummary.totalUsdValue || 0;
            } catch (apiError) {
              logger.error('Failed to get wallet summary', { apiError, walletAddress });
            }
          }
        } catch (dbError) {
          logger.error('Error fetching user data', { dbError, userId });
        }
      }
      
      // Build welcome message based on wallet status
      let welcomeMessage = '';
      
      if (walletAddress && walletInfo) {
        // User has a wallet - show wallet info
        welcomeMessage = `
<b>Solana</b> · <i>ℹ️</i>
<code>${walletAddress}</code> <i>(Tap to copy)</i>
Balance: ${solBalance.toFixed(3)} SOL ($${usdValue.toFixed(2)})
—
Click on the Refresh button to update your current balance.

Join our Telegram group @SolanaResearchGroup and follow us on <a href="https://twitter.com/SolanaResearch">Twitter</a>!

💡 Use the buttons below to access all features:
`;
      } else {
        // No wallet - show standard welcome
        welcomeMessage = `
<b>👋 Welcome to the Solana Research Bot!</b>

This bot provides real-time and historical Solana research, analytics, and notifications.

To get started, add your Solana wallet address using the Wallet Management button.

Join our Telegram group @SolanaResearchGroup and follow us on <a href="https://twitter.com/SolanaResearch">Twitter</a>!

Use the buttons below to navigate:
`;
      }
      
      // Enhanced main menu keyboard with more options
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💼 Wallet Management', 'wallet'),
          Markup.button.callback('🔍 Research', 'research')
        ],
        [
          Markup.button.callback('🚨 Alerts', 'alerts'),
          Markup.button.callback('📊 Market Data', 'research_market')
        ],
        [
          Markup.button.callback('🪙 Token Analysis', 'research_token'),
          Markup.button.callback('🏛 Protocol Health', 'research_protocol')
        ],
        [
          Markup.button.callback('🔄 Refresh', 'refresh_data'),
          Markup.button.callback('⚙️ Settings', 'settings')
        ],
        [
          Markup.button.callback('❓ Help', 'help')
        ]
      ]);
      
      // Delete previous message if possible
      await ctx.deleteMessage().catch(() => logger.debug('Could not delete message'));
      
      // Send welcome message with keyboard
      await ctx.reply(welcomeMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Displayed main menu', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in back_to_main action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle refresh data action - directly show refreshed main menu
  bot.action('refresh_data', async (ctx) => {
    try {
      await ctx.answerCbQuery('Refreshing data...');
      logger.debug('Refreshing data', { from: ctx.from?.id });
      
      // Get user ID
      const userId = ctx.from?.id;
      
      // Import User model
      const User = require('../db/models/User').default;
      
      // Check if user exists and has wallets
      let walletInfo = null;
      let walletAddress = '';
      let solBalance = 0;
      let usdValue = 0;
      
      if (userId) {
        try {
          // Find user in database
          const user = await User.findOne({ telegramId: userId });
          
          if (user && user.wallets && user.wallets.length > 0) {
            // Get the first wallet address
            walletAddress = user.wallets[0]; // Use first wallet for display
            
            // Get wallet summary from Vybe API
            try {
              const walletSummary = await getWalletSummary(walletAddress);
              walletInfo = walletSummary;
              solBalance = walletSummary.solBalance;
              usdValue = walletSummary.totalUsdValue || 0;
            } catch (apiError) {
              logger.error('Failed to get wallet summary', { apiError, walletAddress });
            }
          }
        } catch (dbError) {
          logger.error('Error fetching user data', { dbError, userId });
        }
      }
      
      // Build welcome message based on wallet status
      let welcomeMessage = '';
      
      if (walletAddress && walletInfo) {
        // User has a wallet - show wallet info
        welcomeMessage = `
<b>Solana</b> · <i>ℹ️</i>
<code>${walletAddress}</code> <i>(Tap to copy)</i>
Balance: ${solBalance.toFixed(3)} SOL ($${usdValue.toFixed(2)})
—
Click on the Refresh button to update your current balance.

Join our Telegram group @SolanaResearchGroup and follow us on <a href="https://twitter.com/SolanaResearch">Twitter</a>!

💡 Use the buttons below to access all features:
`;
      } else {
        // No wallet - show standard welcome
        welcomeMessage = `
<b>👋 Welcome to the Solana Research Bot!</b>

This bot provides real-time and historical Solana research, analytics, and notifications.

To get started, add your Solana wallet address using the Wallet Management button.

Join our Telegram group @SolanaResearchGroup and follow us on <a href="https://twitter.com/SolanaResearch">Twitter</a>!

Use the buttons below to navigate:
`;
      }
      
      // Enhanced main menu keyboard with more options
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💼 Wallet Management', 'wallet'),
          Markup.button.callback('🔍 Research', 'research')
        ],
        [
          Markup.button.callback('🚨 Alerts', 'alerts'),
          Markup.button.callback('📊 Market Data', 'research_market')
        ],
        [
          Markup.button.callback('🪙 Token Analysis', 'research_token'),
          Markup.button.callback('🏛 Protocol Health', 'research_protocol')
        ],
        [
          Markup.button.callback('🔄 Refresh', 'refresh_data'),
          Markup.button.callback('⚙️ Settings', 'settings')
        ],
        [
          Markup.button.callback('❓ Help', 'help')
        ]
      ]);
      
      // Delete the current message to avoid cluttering the chat
      await ctx.deleteMessage().catch(() => logger.debug('Could not delete message'));
      
      // Send welcome message with keyboard
      await ctx.reply(welcomeMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Displayed refreshed main menu', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in refresh_data action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while refreshing your data. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle settings action
  bot.action('settings', async (ctx) => {
    try {
      ctx.answerCbQuery();
      logger.debug('Received settings button click', { from: ctx.from?.id });
      
      // Settings message
      const settingsMessage = `
<b>⚙️ Settings</b>

Configure your preferences for the Solana Research Bot.

Select an option:
`;
      
      // Settings keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('🔔 Notification Settings', 'settings_notifications'),
          Markup.button.callback('🌐 Display Settings', 'settings_display')
        ],
        [
          Markup.button.callback('🔒 Privacy Settings', 'settings_privacy'),
          Markup.button.callback('🔙 Back to Main Menu', 'back_to_main')
        ]
      ]);
      
      // Send settings message with keyboard
      await ctx.reply(settingsMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Sent settings message', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in settings button action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Add direct access to research_market action
  bot.action('research_market', async (ctx) => {
    try {
      ctx.answerCbQuery();
      logger.debug('Received research_market button click', { from: ctx.from?.id });
      
      // Market data message
      const marketMessage = `
<b>📊 Market Data</b>

View price and volume data for Solana tokens.

Select an option:
`;
      
      // Market data keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💰 Top Tokens by Volume', 'market_top_volume'),
          Markup.button.callback('📈 Top Gainers', 'market_top_gainers')
        ],
        [
          Markup.button.callback('📉 Top Losers', 'market_top_losers'),
          Markup.button.callback('🔍 Search Token', 'market_search')
        ],
        [
          Markup.button.callback('🔙 Back to Main Menu', 'back_to_main')
        ]
      ]);
      
      // Send market data message with keyboard
      await ctx.reply(marketMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Sent market data message', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in research_market button action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Add direct access to research_token action
  bot.action('research_token', async (ctx) => {
    try {
      ctx.answerCbQuery();
      logger.debug('Received research_token button click', { from: ctx.from?.id });
      
      // Token analysis message
      const tokenMessage = `
<b>🪙 Token Analysis</b>

Get detailed information about Solana tokens.

Enter a token address or select an option:
`;
      
      // Token analysis keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('🔍 Search by Symbol', 'token_search_symbol'),
          Markup.button.callback('📋 Search by Address', 'token_search_address')
        ],
        [
          Markup.button.callback('⭐ Popular Tokens', 'token_popular'),
          Markup.button.callback('🔙 Back to Main Menu', 'back_to_main')
        ]
      ]);
      
      // Send token analysis message with keyboard
      await ctx.reply(tokenMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Sent token analysis message', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in research_token button action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Add direct access to research_protocol action
  bot.action('research_protocol', async (ctx) => {
    try {
      ctx.answerCbQuery();
      logger.debug('Received research_protocol button click', { from: ctx.from?.id });
      
      // Protocol health message
      const protocolMessage = `
<b>🏛 Protocol Health</b>

Check TVL and user activity for Solana protocols.

Select an option:
`;
      
      // Protocol health keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💰 Top by TVL', 'protocol_top_tvl'),
          Markup.button.callback('👥 Top by Users', 'protocol_top_users')
        ],
        [
          Markup.button.callback('🔍 Search Protocol', 'protocol_search'),
          Markup.button.callback('🔙 Back to Main Menu', 'back_to_main')
        ]
      ]);
      
      // Send protocol health message with keyboard
      await ctx.reply(protocolMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.debug('Sent protocol health message', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in research_protocol button action', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  logger.info('Registered /start command with enhanced functionality');
};
