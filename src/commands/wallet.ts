import { Telegraf, Context } from 'telegraf';
import { Markup } from 'telegraf';
import { User } from '../db/models/User';
import logger from '../utils/logger';

/**
 * Registers the /wallet command with the bot
 * @param bot Telegraf bot instance
 */
export const registerWalletCommand = (bot: Telegraf<Context>): void => {
  // Main wallet command
  bot.command('wallet', async (ctx) => {
    try {
      logger.debug('Received /wallet command', { from: ctx.from?.id });
      
      // Wallet management message
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
      logger.error('Error in /wallet command', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle wallet add action
  bot.action('wallet_add', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      await ctx.reply(`
<b>➕ Add Wallet</b>

Please send your Solana wallet address.
Example: <code>5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8</code>
`, {
        parse_mode: 'HTML'
      });
      
      // Set up a listener for the next message
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Use a one-time listener for the next message
      bot.use(async (ctx, next) => {
        // Only process if it's a message from the same user
        if (ctx.message && 'text' in ctx.message && ctx.from?.id === userId) {
          const walletAddress = ctx.message.text.trim();
          
          // Validate Solana wallet address (base58 encoded, 32-44 chars)
          if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
            await ctx.reply('Invalid Solana wallet address. Please try again.', {
              parse_mode: 'HTML'
            });
            return;
          }
          
          try {
            // Find or create user
            let user = await User.findOne({ telegramId: userId.toString() });
            
            if (!user) {
              user = new User({
                telegramId: userId.toString(),
                wallets: []
              });
            }
            
            // Check if wallet already exists
            if (user.wallets.includes(walletAddress)) {
              await ctx.reply('This wallet address is already in your list.', {
                parse_mode: 'HTML'
              });
              return;
            }
            
            // Add wallet to user
            user.wallets.push(walletAddress);
            await user.save();
            
            await ctx.reply(`
<b>✅ Wallet Added</b>

The wallet address <code>${walletAddress}</code> has been added to your list.

Use /wallet to manage your wallets.
`, {
              parse_mode: 'HTML'
            });
            
            logger.info('Added wallet to user', { userId, walletAddress });
          } catch (error: any) {
            logger.error('Error adding wallet', { error, userId, walletAddress });
            
            await ctx.reply('An error occurred while adding the wallet. Please try again.', {
              parse_mode: 'HTML'
            });
          }
          
          // Remove this listener
          return;
        }
        
        // Pass to next middleware
        return next();
      });
    } catch (error: any) {
      logger.error('Error in wallet_add action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle wallet remove action
  bot.action('wallet_remove', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Find user
      const user = await User.findOne({ telegramId: userId.toString() });
      
      if (!user || user.wallets.length === 0) {
        await ctx.reply('You have no wallet addresses saved.', {
          parse_mode: 'HTML'
        });
        return;
      }
      
      // Create keyboard with wallet addresses
      const buttons = user.wallets.map(wallet => [
        Markup.button.callback(`${wallet.substring(0, 4)}...${wallet.substring(wallet.length - 4)}`, `remove_wallet:${wallet}`)
      ]);
      
      // Add cancel button
      buttons.push([Markup.button.callback('🔙 Cancel', 'wallet')]);
      
      const keyboard = Markup.inlineKeyboard(buttons);
      
      await ctx.reply(`
<b>➖ Remove Wallet</b>

Select a wallet address to remove:
`, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (error: any) {
      logger.error('Error in wallet_remove action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle wallet remove confirmation
  bot.action(/^remove_wallet:(.+)$/, async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const match = ctx.match[1];
      const walletAddress = match;
      
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Find user
      const user = await User.findOne({ telegramId: userId.toString() });
      
      if (!user) {
        await ctx.reply('You have no wallet addresses saved.', {
          parse_mode: 'HTML'
        });
        return;
      }
      
      // Remove wallet from user
      user.wallets = user.wallets.filter(wallet => wallet !== walletAddress);
      await user.save();
      
      await ctx.reply(`
<b>✅ Wallet Removed</b>

The wallet address <code>${walletAddress}</code> has been removed from your list.

Use /wallet to manage your wallets.
`, {
        parse_mode: 'HTML'
      });
      
      logger.info('Removed wallet from user', { userId, walletAddress });
    } catch (error: any) {
      logger.error('Error in remove_wallet action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle wallet list action
  bot.action('wallet_list', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Find user
      const user = await User.findOne({ telegramId: userId.toString() });
      
      if (!user || user.wallets.length === 0) {
        await ctx.reply(`
<b>📋 Your Wallets</b>

You have no wallet addresses saved.

Use the "Add Wallet" option to add a wallet address.
`, {
          parse_mode: 'HTML'
        });
        return;
      }
      
      // Format wallet list
      const walletList = user.wallets.map((wallet, index) => 
        `${index + 1}. <code>${wallet}</code>`
      ).join('\n');
      
      await ctx.reply(`
<b>📋 Your Wallets</b>

You have ${user.wallets.length} wallet address(es) saved:

${walletList}

Use /wallet to manage your wallets.
`, {
        parse_mode: 'HTML'
      });
      
      logger.debug('Listed wallets for user', { userId, walletCount: user.wallets.length });
    } catch (error: any) {
      logger.error('Error in wallet_list action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle back to main menu action
  bot.action('back_to_main', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      // Simulate /start command
      await ctx.reply('Returning to main menu...', {
        parse_mode: 'HTML'
      });
      
      // Call /start command
      await ctx.telegram.sendMessage(ctx.from!.id, '/start');
    } catch (error: any) {
      logger.error('Error in back_to_main action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  logger.info('Registered /wallet command');
};
