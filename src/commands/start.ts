import { Telegraf, Context } from 'telegraf';
import { Markup } from 'telegraf';
import { getWalletSummary } from '../modules/vybeApi';
import logger from '../utils/logger';
import { User } from '../db/models/User';
import { mongooseInstance } from '../db';

/**
 * Registers the /start command with the bot.
 * The welcome message is wrapped in a full‑width <div> so Telegram expands it.
 */
export const registerStartCommand = (bot: Telegraf<Context>): void => {
  bot.command('start', async (ctx) => {
    try {
      logger.debug('Received /start command', { from: ctx.from?.id });

      const userId = ctx.from?.id;
      logger.debug('User ID from context', { userId });
      
      // Log information about the User model
      logger.debug('User model information', { 
        modelName: User?.modelName,
        isModel: User instanceof mongooseInstance.Model
      });

      let walletInfo = null;
      let walletAddress = '';
      let solBalance = 0;
      let usdValue = 0;

      if (userId) {
        try {
          logger.debug('Attempting to find user in database', { telegramId: userId });
          const user = await User.findOne({ telegramId: userId });
          logger.debug('Database query result', { 
            userFound: !!user,
            hasWallets: user && user.wallets ? user.wallets.length > 0 : false
          });
          if (user && user.wallets && user.wallets.length > 0) {
            walletAddress = user.wallets[0];
            try {
              const walletSummary = await getWalletSummary(walletAddress);
              walletInfo = walletSummary;
              solBalance = walletSummary.solBalance;
              usdValue = walletSummary.totalUsdValue || 0;
            } catch (apiError) {
              logger.error('Failed to get wallet summary', { apiError, walletAddress });
            }
          }
        } catch (dbError: any) {
          logger.error('Error fetching user data', { 
            dbError, 
            userId,
            errorName: dbError.name,
            errorMessage: dbError.message,
            errorStack: dbError.stack
          });
        }
      }

      // Build a simpler welcome message to test if HTML formatting is causing issues
      let welcomeMessage = '';
      if (walletAddress && walletInfo) {
        // Simplified message without nested divs
        welcomeMessage = `<b>Solana Wallet</b>\n\n${walletAddress}\n\nBalance: ${solBalance.toFixed(3)} SOL ($${usdValue.toFixed(2)})\n\n💡 Use the buttons below to access all features:`;
      } else {
        // Simplified welcome message
        welcomeMessage = `<b>👋 Welcome to the On-Chain Analysis Bot!</b>\n\nOCA-bot provides real-time and historical Solana research, analytics, and notifications via the Vybe API`;
      }
      
      // Log the message for debugging
      logger.debug('Welcome message', {
        messageLength: welcomeMessage.length,
        messagePreview: welcomeMessage.substring(0, 50) + '...'
      });

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

      // Log the state before sending the reply
      logger.debug('State before sending reply', {
        hasWalletAddress: !!walletAddress,
        hasWalletInfo: !!walletInfo,
        welcomeMessageLength: welcomeMessage.length,
        keyboardButtons: keyboard.reply_markup?.inline_keyboard?.length || 0
      });
      
      await ctx.reply(welcomeMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });

      logger.debug('Sent welcome message', { to: ctx.from?.id });
    } catch (error: any) {
      // Log the full error details
      logger.error('Error in /start command', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
        errorCode: error.code,
        errorType: typeof error,
        errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        from: ctx.from?.id
      });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });

  // The remaining button handlers remain similar,
  // ensuring any output message is wrapped in a full-width container.
  bot.action('wallet', async (ctx) => {
    try {
      ctx.answerCbQuery();
      logger.debug('Received wallet button click', { from: ctx.from?.id });

      const walletMessage = `
<div style="width:100%; line-height:1.4;">
  <b>💼 Wallet Management</b><br><br>
  You can add, remove, or list your Solana wallet addresses.<br>
  Select an option:
</div>
      `;
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
      await ctx.reply(walletMessage, { parse_mode: 'HTML', ...keyboard });
      logger.debug('Sent wallet management message', { to: ctx.from?.id });
    } catch (error: any) {
      logger.error('Error in wallet button action', { error, from: ctx.from?.id });
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });

  // (Other actions remain unchanged – ensure that any text you want to appear wide is wrapped in <div style="width:100%;">)
  // ...
};
