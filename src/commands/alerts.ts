import { Telegraf, Context } from 'telegraf';
import { Markup } from 'telegraf';
import { User } from '../db/models/User';
import { Alert } from '../db/models/Alert';
import * as vybeApi from '../modules/vybeApi';
import logger from '../utils/logger';

/**
 * Registers the /alerts command with the bot
 * @param bot Telegraf bot instance
 */
export const registerAlertsCommand = (bot: Telegraf<Context>): void => {
  // Main alerts command
  bot.command('alerts', async (ctx) => {
    try {
      logger.debug('Received /alerts command', { from: ctx.from?.id });
      
      // Alerts message
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
      logger.error('Error in /alerts command', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle create alert action
  bot.action('alert_create', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      // Alert types message
      const alertTypesMessage = `
<b>➕ Create Alert</b>

Select the type of alert you want to create:
`;
      
      // Alert types keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💰 Price Alert', 'create_price_alert'),
          Markup.button.callback('💼 Balance Alert', 'create_balance_alert')
        ],
        [
          Markup.button.callback('📈 TVL Alert', 'create_tvl_alert'),
          Markup.button.callback('👥 Active Users Alert', 'create_users_alert')
        ],
        [
          Markup.button.callback('🔙 Back to Alerts', 'alerts')
        ]
      ]);
      
      // Send alert types message with keyboard
      await ctx.reply(alertTypesMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (error) {
      logger.error('Error in alert_create action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle create price alert action
  bot.action('create_price_alert', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      await ctx.reply(`
<b>💰 Create Price Alert</b>

Please send the token mint address you want to track.
Example: <code>EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v</code> (USDC)
`, {
        parse_mode: 'HTML'
      });
      
      // Store alert creation state
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Use a one-time listener for the next message
      bot.use(async (ctx, next) => {
        // Only process if it's a message from the same user
        if (ctx.message && 'text' in ctx.message && ctx.from?.id === userId) {
          const mintAddress = ctx.message.text.trim();
          
          // Validate Solana mint address (base58 encoded, 32-44 chars)
          if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mintAddress)) {
            await ctx.reply('Invalid Solana token mint address. Please try again.', {
              parse_mode: 'HTML'
            });
            return;
          }
          
          // Get token info to verify it exists
          try {
            const tokenInfo = await vybeApi.getTokenInfo(mintAddress);
            
            // Ask for threshold
            await ctx.reply(`
<b>💰 Create Price Alert for ${tokenInfo.symbol || 'Token'}</b>

Please send the price threshold in USD.
Example: <code>2.5</code> for $2.50
`, {
              parse_mode: 'HTML'
            });
            
            // Use another one-time listener for the threshold
            bot.use(async (ctx, next) => {
              // Only process if it's a message from the same user
              if (ctx.message && 'text' in ctx.message && ctx.from?.id === userId) {
                const thresholdText = ctx.message.text.trim();
                const threshold = parseFloat(thresholdText);
                
                // Validate threshold
                if (isNaN(threshold) || threshold <= 0) {
                  await ctx.reply('Invalid threshold. Please enter a positive number.', {
                    parse_mode: 'HTML'
                  });
                  return;
                }
                
                // Ask for operator
                const keyboard = Markup.inlineKeyboard([
                  [
                    Markup.button.callback('Above threshold', `price_alert_operator:gt:${mintAddress}:${threshold}`),
                    Markup.button.callback('Below threshold', `price_alert_operator:lt:${mintAddress}:${threshold}`)
                  ]
                ]);
                
                await ctx.reply(`
<b>💰 Create Price Alert for ${tokenInfo.symbol || 'Token'}</b>

Do you want to be notified when the price goes above or below $${threshold.toFixed(2)}?
`, {
                  parse_mode: 'HTML',
                  ...keyboard
                });
                
                // Remove this listener
                return;
              }
              
              // Pass to next middleware
              return next();
            });
            
            // Remove this listener
            return;
          } catch (error) {
            logger.error('Error getting token info', { error, mintAddress });
            
            await ctx.reply(`
<b>❌ Error</b>

Failed to get information for token <code>${mintAddress}</code>.
Please check the address and try again.
`, {
              parse_mode: 'HTML'
            });
            return;
          }
        }
        
        // Pass to next middleware
        return next();
      });
    } catch (error) {
      logger.error('Error in create_price_alert action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle price alert operator action
  bot.action(/^price_alert_operator:(.+):(.+):(.+)$/, async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const operator = ctx.match[1] as 'gt' | 'lt';
      const mintAddress = ctx.match[2];
      const threshold = parseFloat(ctx.match[3]);
      
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Ask for label
      await ctx.reply(`
<b>💰 Create Price Alert</b>

Please enter a label for this alert (optional).
Example: <code>USDC price alert</code>

Or send <code>skip</code> to skip this step.
`, {
        parse_mode: 'HTML'
      });
      
      // Use a one-time listener for the label
      bot.use(async (ctx, next) => {
        // Only process if it's a message from the same user
        if (ctx.message && 'text' in ctx.message && ctx.from?.id === userId) {
          const label = ctx.message.text.trim() === 'skip' ? undefined : ctx.message.text.trim();
          
          // Create alert
          try {
            const alert = new Alert({
              telegramId: userId.toString(),
              alertType: 'price',
              label,
              condition: {
                assetMint: mintAddress,
                threshold,
                operator
              },
              isEnabled: true
            });
            
            await alert.save();
            
            // Get token info for confirmation message
            const tokenInfo = await vybeApi.getTokenInfo(mintAddress);
            
            await ctx.reply(`
<b>✅ Price Alert Created</b>

You will be notified when the price of ${tokenInfo.symbol || 'the token'} goes ${operator === 'gt' ? 'above' : 'below'} $${threshold.toFixed(2)}.

${label ? `Label: ${label}` : ''}

Use /alerts to manage your alerts.
`, {
              parse_mode: 'HTML'
            });
            
            logger.info('Created price alert', { userId, mintAddress, threshold, operator });
          } catch (error) {
            logger.error('Error creating price alert', { error, userId, mintAddress, threshold, operator });
            
            await ctx.reply('An error occurred while creating the alert. Please try again.', {
              parse_mode: 'HTML'
            });
          }
          
          // Remove this listener
          return;
        }
        
        // Pass to next middleware
        return next();
      });
    } catch (error) {
      logger.error('Error in price_alert_operator action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle create balance alert action
  bot.action('create_balance_alert', async (ctx) => {
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
<b>💼 Create Balance Alert</b>

You have no wallet addresses saved. Please add a wallet first using /wallet.
`, {
          parse_mode: 'HTML'
        });
        return;
      }
      
      // User has saved wallets, show a list to choose from
      const buttons = user.wallets.map(wallet => [
        Markup.button.callback(`${wallet.substring(0, 4)}...${wallet.substring(wallet.length - 4)}`, `balance_alert_wallet:${wallet}`)
      ]);
      
      // Add back button
      buttons.push([Markup.button.callback('🔙 Back to Alerts', 'alert_create')]);
      
      const keyboard = Markup.inlineKeyboard(buttons);
      
      await ctx.reply(`
<b>💼 Create Balance Alert</b>

Select a wallet to monitor:
`, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (error) {
      logger.error('Error in create_balance_alert action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle balance alert wallet action
  bot.action(/^balance_alert_wallet:(.+)$/, async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const walletAddress = ctx.match[1];
      
      await ctx.reply(`
<b>💼 Create Balance Alert</b>

Please send the token mint address you want to track.
Example: <code>EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v</code> (USDC)

Or send <code>SOL</code> to track SOL balance.
`, {
        parse_mode: 'HTML'
      });
      
      // Store alert creation state
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Use a one-time listener for the next message
      bot.use(async (ctx, next) => {
        // Only process if it's a message from the same user
        if (ctx.message && 'text' in ctx.message && ctx.from?.id === userId) {
          const mintInput = ctx.message.text.trim();
          let mintAddress = mintInput;
          let tokenSymbol = 'the token';
          
          // Handle SOL special case
          if (mintInput.toUpperCase() === 'SOL') {
            mintAddress = 'SOL';
            tokenSymbol = 'SOL';
          } else {
            // Validate Solana mint address (base58 encoded, 32-44 chars)
            if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mintAddress)) {
              await ctx.reply('Invalid Solana token mint address. Please try again.', {
                parse_mode: 'HTML'
              });
              return;
            }
            
            // Get token info to verify it exists
            try {
              const tokenInfo = await vybeApi.getTokenInfo(mintAddress);
              tokenSymbol = tokenInfo.symbol || 'the token';
            } catch (error) {
              logger.error('Error getting token info', { error, mintAddress });
              
              await ctx.reply(`
<b>❌ Error</b>

Failed to get information for token <code>${mintAddress}</code>.
Please check the address and try again.
`, {
                parse_mode: 'HTML'
              });
              return;
            }
          }
          
          // Ask for threshold
          await ctx.reply(`
<b>💼 Create Balance Alert for ${tokenSymbol}</b>

Please send the balance threshold.
Example: <code>100</code> for 100 ${tokenSymbol}
`, {
            parse_mode: 'HTML'
          });
          
          // Use another one-time listener for the threshold
          bot.use(async (ctx, next) => {
            // Only process if it's a message from the same user
            if (ctx.message && 'text' in ctx.message && ctx.from?.id === userId) {
              const thresholdText = ctx.message.text.trim();
              const threshold = parseFloat(thresholdText);
              
              // Validate threshold
              if (isNaN(threshold) || threshold <= 0) {
                await ctx.reply('Invalid threshold. Please enter a positive number.', {
                  parse_mode: 'HTML'
                });
                return;
              }
              
              // Ask for operator
              const keyboard = Markup.inlineKeyboard([
                [
                  Markup.button.callback('Above threshold', `balance_alert_operator:gt:${walletAddress}:${mintAddress}:${threshold}`),
                  Markup.button.callback('Below threshold', `balance_alert_operator:lt:${walletAddress}:${mintAddress}:${threshold}`)
                ]
              ]);
              
              await ctx.reply(`
<b>💼 Create Balance Alert for ${tokenSymbol}</b>

Do you want to be notified when the balance goes above or below ${threshold} ${tokenSymbol}?
`, {
                parse_mode: 'HTML',
                ...keyboard
              });
              
              // Remove this listener
              return;
            }
            
            // Pass to next middleware
            return next();
          });
          
          // Remove this listener
          return;
        }
        
        // Pass to next middleware
        return next();
      });
    } catch (error) {
      logger.error('Error in balance_alert_wallet action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle balance alert operator action
  bot.action(/^balance_alert_operator:(.+):(.+):(.+):(.+)$/, async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const operator = ctx.match[1] as 'gt' | 'lt';
      const walletAddress = ctx.match[2];
      const mintAddress = ctx.match[3];
      const threshold = parseFloat(ctx.match[4]);
      
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Ask for label
      await ctx.reply(`
<b>💼 Create Balance Alert</b>

Please enter a label for this alert (optional).
Example: <code>USDC balance alert</code>

Or send <code>skip</code> to skip this step.
`, {
        parse_mode: 'HTML'
      });
      
      // Use a one-time listener for the label
      bot.use(async (ctx, next) => {
        // Only process if it's a message from the same user
        if (ctx.message && 'text' in ctx.message && ctx.from?.id === userId) {
          const label = ctx.message.text.trim() === 'skip' ? undefined : ctx.message.text.trim();
          
          // Create alert
          try {
            const alert = new Alert({
              telegramId: userId.toString(),
              alertType: 'balance',
              label,
              condition: {
                walletAddress,
                assetMint: mintAddress,
                threshold,
                operator
              },
              isEnabled: true
            });
            
            await alert.save();
            
            // Get token symbol
            let tokenSymbol = 'the token';
            if (mintAddress === 'SOL') {
              tokenSymbol = 'SOL';
            } else {
              try {
                const tokenInfo = await vybeApi.getTokenInfo(mintAddress);
                tokenSymbol = tokenInfo.symbol || 'the token';
              } catch (error) {
                // Ignore error, use default symbol
              }
            }
            
            await ctx.reply(`
<b>✅ Balance Alert Created</b>

You will be notified when the balance of ${tokenSymbol} in wallet ${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)} goes ${operator === 'gt' ? 'above' : 'below'} ${threshold} ${tokenSymbol}.

${label ? `Label: ${label}` : ''}

Use /alerts to manage your alerts.
`, {
              parse_mode: 'HTML'
            });
            
            logger.info('Created balance alert', { userId, walletAddress, mintAddress, threshold, operator });
          } catch (error) {
            logger.error('Error creating balance alert', { error, userId, walletAddress, mintAddress, threshold, operator });
            
            await ctx.reply('An error occurred while creating the alert. Please try again.', {
              parse_mode: 'HTML'
            });
          }
          
          // Remove this listener
          return;
        }
        
        // Pass to next middleware
        return next();
      });
    } catch (error) {
      logger.error('Error in balance_alert_operator action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle list alerts action
  bot.action('alert_list', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Find alerts
      const alerts = await Alert.find({ telegramId: userId.toString() });
      
      if (alerts.length === 0) {
        await ctx.reply(`
<b>📋 Your Alerts</b>

You have no alerts set up.

Use the "Create Alert" option to set up an alert.
`, {
          parse_mode: 'HTML'
        });
        return;
      }
      
      // Format alert list
      let alertList = '';
      
      for (let i = 0; i < alerts.length; i++) {
        const alert = alerts[i];
        const condition = alert.condition as any;
        
        let alertDescription = '';
        
        switch (alert.alertType) {
          case 'price':
            alertDescription = `Price ${condition.operator === 'gt' ? 'above' : 'below'} $${condition.threshold} for ${condition.assetMint.substring(0, 4)}...${condition.assetMint.substring(condition.assetMint.length - 4)}`;
            break;
          case 'balance':
            alertDescription = `Balance ${condition.operator === 'gt' ? 'above' : 'below'} ${condition.threshold} for wallet ${condition.walletAddress.substring(0, 4)}...${condition.walletAddress.substring(condition.walletAddress.length - 4)}`;
            break;
          case 'tvl':
            alertDescription = `TVL ${condition.operator === 'gt' ? 'above' : 'below'} $${condition.threshold} for program ${condition.programId.substring(0, 4)}...${condition.programId.substring(condition.programId.length - 4)}`;
            break;
          case 'activeUsers':
            alertDescription = `Active users ${condition.operator === 'gt' ? 'above' : 'below'} ${condition.threshold} for program ${condition.programId.substring(0, 4)}...${condition.programId.substring(condition.programId.length - 4)}`;
            break;
        }
        
        alertList += `${i + 1}. ${alert.label ? `<b>${alert.label}</b>: ` : ''}${alertDescription} (${alert.isEnabled ? 'Enabled' : 'Disabled'})\n`;
      }
      
      await ctx.reply(`
<b>📋 Your Alerts</b>

You have ${alerts.length} alert(s) set up:

${alertList}

Use /alerts to manage your alerts.
`, {
        parse_mode: 'HTML'
      });
      
      logger.debug('Listed alerts for user', { userId, alertCount: alerts.length });
    } catch (error) {
      logger.error('Error in alert_list action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle delete alert action
  bot.action('alert_delete', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Find alerts
      const alerts = await Alert.find({ telegramId: userId.toString() });
      
      if (alerts.length === 0) {
        await ctx.reply(`
<b>➖ Delete Alert</b>

You have no alerts set up.

Use the "Create Alert" option to set up an alert.
`, {
          parse_mode: 'HTML'
        });
        return;
      }
      
      // Create keyboard with alerts
      const buttons = alerts.map((alert, index) => {
        const condition = alert.condition as any;
        let alertDescription = '';
        
        switch (alert.alertType) {
          case 'price':
            alertDescription = `Price ${condition.operator === 'gt' ? '>' : '<'} $${condition.threshold}`;
            break;
          case 'balance':
            alertDescription = `Balance ${condition.operator === 'gt' ? '>' : '<'} ${condition.threshold}`;
            break;
          case 'tvl':
            alertDescription = `TVL ${condition.operator === 'gt' ? '>' : '<'} $${condition.threshold}`;
            break;
          case 'activeUsers':
            alertDescription = `Users ${condition.operator === 'gt' ? '>' : '<'} ${condition.threshold}`;
            break;
        }
        
        const buttonText = alert.label ? `${index + 1}. ${alert.label}` : `${index + 1}. ${alertDescription}`;
        
        return [Markup.button.callback(buttonText, `delete_alert:${alert._id}`)];
      });
      
      // Add cancel button
      buttons.push([Markup.button.callback('🔙 Cancel', 'alerts')]);
      
      const keyboard = Markup.inlineKeyboard(buttons);
      
      await ctx.reply(`
<b>➖ Delete Alert</b>

Select an alert to delete:
`, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (error) {
      logger.error('Error in alert_delete action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle delete alert confirmation
  bot.action(/^delete_alert:(.+)$/, async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const alertId = ctx.match[1];
      
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Find alert
      const alert = await Alert.findOne({ _id: alertId, telegramId: userId.toString() });
      
      if (!alert) {
        await ctx.reply('Alert not found. It may have been deleted already.', {
          parse_mode: 'HTML'
        });
        return;
      }
      
      // Delete alert
      await Alert.deleteOne({ _id: alertId });
      
      await ctx.reply(`
<b>✅ Alert Deleted</b>

The alert has been deleted.

Use /alerts to manage your alerts.
`, {
        parse_mode: 'HTML'
      });
      
      logger.info('Deleted alert', { userId, alertId });
    } catch (error) {
      logger.error('Error in delete_alert action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle back to alerts action
  bot.action('alerts', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('/alerts', { parse_mode: 'HTML' });
  });
  
  logger.info('Registered /alerts command');
};
