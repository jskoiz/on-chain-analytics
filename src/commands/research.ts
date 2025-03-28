import { Telegraf, Context } from 'telegraf';
import { Markup } from 'telegraf';
import { User } from '../db/models/User';
import * as vybeApi from '../modules/vybeApi';
import { formatWalletSummaryHTML, formatTokenInfoHTML, formatProgramHealthHTML } from '../utils/formatters';
import logger from '../utils/logger';

/**
 * Registers the /research command with the bot
 * @param bot Telegraf bot instance
 */
export const registerResearchCommand = (bot: Telegraf<Context>): void => {
  // Main research command
  bot.command('research', async (ctx) => {
    try {
      logger.debug('Received /research command', { from: ctx.from?.id });
      
      // Research message
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
      logger.error('Error in /research command', { error, from: ctx.from?.id });
      
      // Send error message
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle wallet analysis action
  bot.action('research_wallet', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const userId = ctx.from?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Find user
      const user = await User.findOne({ telegramId: userId.toString() });
      
      if (!user || user.wallets.length === 0) {
        // No saved wallets, ask for a wallet address
        await ctx.reply(`
<b>💼 Wallet Analysis</b>

You have no wallet addresses saved. Please send a Solana wallet address to analyze.
Example: <code>5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8</code>

Or use /wallet to manage your saved wallet addresses.
`, {
          parse_mode: 'HTML'
        });
        
        // Set up a listener for the next message
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
            
            // Analyze wallet
            await analyzeWallet(ctx, walletAddress);
            
            // Remove this listener
            return;
          }
          
          // Pass to next middleware
          return next();
        });
        
        return;
      }
      
      // User has saved wallets, show a list to choose from
      const buttons = user.wallets.map(wallet => [
        Markup.button.callback(`${wallet.substring(0, 4)}...${wallet.substring(wallet.length - 4)}`, `analyze_wallet:${wallet}`)
      ]);
      
      // Add option to enter a different wallet
      buttons.push([Markup.button.callback('Enter a different wallet', 'enter_wallet')]);
      
      // Add back button
      buttons.push([Markup.button.callback('🔙 Back to Research', 'research')]);
      
      const keyboard = Markup.inlineKeyboard(buttons);
      
      await ctx.reply(`
<b>💼 Wallet Analysis</b>

Select a wallet to analyze:
`, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (error) {
      logger.error('Error in research_wallet action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle analyze wallet action
  bot.action(/^analyze_wallet:(.+)$/, async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const match = ctx.match[1];
      const walletAddress = match;
      
      // Analyze wallet
      await analyzeWallet(ctx, walletAddress);
    } catch (error) {
      logger.error('Error in analyze_wallet action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle enter wallet action
  bot.action('enter_wallet', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      await ctx.reply(`
<b>💼 Wallet Analysis</b>

Please send a Solana wallet address to analyze.
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
          
          // Analyze wallet
          await analyzeWallet(ctx, walletAddress);
          
          // Remove this listener
          return;
        }
        
        // Pass to next middleware
        return next();
      });
    } catch (error) {
      logger.error('Error in enter_wallet action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle token deep dive action
  bot.action('research_token', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      await ctx.reply(`
<b>🪙 Token Deep Dive</b>

Please send a Solana token mint address to analyze.
Example: <code>EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v</code> (USDC)
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
          const mintAddress = ctx.message.text.trim();
          
          // Validate Solana mint address (base58 encoded, 32-44 chars)
          if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mintAddress)) {
            await ctx.reply('Invalid Solana token mint address. Please try again.', {
              parse_mode: 'HTML'
            });
            return;
          }
          
          // Analyze token
          await analyzeToken(ctx, mintAddress);
          
          // Remove this listener
          return;
        }
        
        // Pass to next middleware
        return next();
      });
    } catch (error) {
      logger.error('Error in research_token action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle market data action
  bot.action('research_market', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      // Market data message
      const marketMessage = `
<b>📊 Market Data</b>

Select a market data option:
`;
      
      // Market data keyboard
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('Top Tokens by Volume', 'market_top_volume'),
          Markup.button.callback('Top Gainers', 'market_top_gainers')
        ],
        [
          Markup.button.callback('Top Losers', 'market_top_losers'),
          Markup.button.callback('Market Pairs', 'market_pairs')
        ],
        [
          Markup.button.callback('🔙 Back to Research', 'research')
        ]
      ]);
      
      // Send market data message with keyboard
      await ctx.reply(marketMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (error) {
      logger.error('Error in research_market action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle top tokens by volume action
  bot.action('market_top_volume', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      // Send loading message
      const loadingMessage = await ctx.reply(`
<b>📊 Top Tokens by Volume</b>

Fetching data...
`, {
        parse_mode: 'HTML'
      });
      
      try {
        // Get top tokens by volume using the token volume time series endpoint
        // We'll use a list of popular token mint addresses
        const popularTokens = [
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          'So11111111111111111111111111111111111111112',  // SOL (Wrapped)
          'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
          'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  // mSOL
          'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
          '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', // stSOL
          'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ', // DUST
          'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',  // JUP
          'AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB', // GST
          'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6', // KIN
          'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', // ORCA
          'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac', // MNGO
        ];
        
        // Get current timestamp and 24 hours ago timestamp
        const now = Math.floor(Date.now() / 1000);
        const oneDayAgo = now - (24 * 60 * 60);
        
        // Fetch volume data for each token in parallel
        logger.debug('Fetching token volume data for multiple tokens');
        const volumePromises = popularTokens.map(mintAddress => 
          vybeApi.getTokenVolumeTimeSeries({
            mintAddress,
            startTime: oneDayAgo,
            endTime: now,
            interval: 'day',
            limit: 1
          }).catch(error => {
            logger.debug(`Failed to fetch volume for token ${mintAddress}`, { error });
            return null; // Return null for failed requests
          })
        );
        
        const volumeResults = await Promise.all(volumePromises);
        
        // Log the raw results for debugging
        logger.debug('Token volume API results:', {
          resultsCount: volumeResults.length,
          hasNullResults: volumeResults.some(r => r === null),
          resultsWithData: volumeResults.filter(r => r && r.data && r.data.length).length
        });
        
        // Process results and calculate total volume for each token
        const tokenVolumes = volumeResults
          .map((result, index) => {
            const mintAddress = popularTokens[index];
            
            if (!result || !result.data || !result.data.length) {
              logger.debug(`No data for token ${mintAddress}`);
              return null;
            }
            
            // Get the token data
            const tokenData = result.data[0];
            
            // Log the token data for debugging
            logger.debug(`Token data for ${mintAddress}:`, {
              symbol: tokenData.symbol,
              volume: tokenData.volume,
              hasVolumeProperty: 'volume' in tokenData,
              dataKeys: Object.keys(tokenData)
            });
            
            // Extract volume and symbol
            return {
              mintAddress,
              symbol: tokenData.symbol || 'Unknown',
              volume: tokenData.volume || 0
            };
          });
        
        // Log the processed token volumes
        logger.debug('Processed token volumes:', {
          totalTokens: tokenVolumes.length,
          tokensWithVolume: tokenVolumes.filter(t => t !== null && t.volume > 0).length,
          allVolumes: tokenVolumes.filter(t => t !== null).map(t => ({ symbol: t.symbol, volume: t.volume }))
        });
        
        // Sort by volume (descending) - include all tokens for debugging
        const sortedTokens = tokenVolumes
          .filter(token => token !== null)
          .sort((a, b) => (b?.volume || 0) - (a?.volume || 0))
          .slice(0, 10);
        
        // Format the response - show tokens even if they have zero volume
        const formattedResponse = `
<b>📊 Top Tokens by Volume (24h)</b>

${sortedTokens.length > 0 ?
  sortedTokens.map((token, index) => {
    const volume = `$${(token?.volume || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    return `${index + 1}. <b>${token?.symbol || 'Unknown'}</b> - ${volume}`;
  }).join('\n') :
  'No volume data available at this time.'
}

<i>Data provided by Vybe API</i>
`;
        
        // Delete loading message
        await ctx.deleteMessage(loadingMessage.message_id);
        
        // Send formatted response
        await ctx.reply(formattedResponse, {
          parse_mode: 'HTML'
        });
        
        // Send options for further actions
        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Refresh', 'market_top_volume')
          ],
          [
            Markup.button.callback('🔙 Back to Market Data', 'research_market')
          ]
        ]);
        
        await ctx.reply('What would you like to do next?', {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (error) {
        // Delete loading message
        await ctx.deleteMessage(loadingMessage.message_id);
        
        // Send error message
        await ctx.reply(`
<b>❌ Error</b>

Failed to fetch top tokens by volume.
Please try again later.
`, {
          parse_mode: 'HTML'
        });
        
        logger.error('Error fetching top tokens by volume', { error, from: ctx.from?.id });
      }
    } catch (error) {
      logger.error('Error in market_top_volume action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle top gainers action
  bot.action('market_top_gainers', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      // Send loading message
      const loadingMessage = await ctx.reply(`
<b>📈 Top Gainers</b>

Fetching data...
`, {
        parse_mode: 'HTML'
      });
      
      try {
        // Get market pairs
        const marketPairsResponse = await vybeApi.getMarketPairs();
        
        // Sort by price change (descending)
        const sortedPairs = [...marketPairsResponse.markets || []].filter(pair => 
          pair.priceChange24h !== undefined && pair.priceChange24h > 0
        ).sort((a, b) => 
          (b.priceChange24h || 0) - (a.priceChange24h || 0)
        ).slice(0, 10); // Get top 10
        
        // Format the response
        const formattedResponse = `
<b>📈 Top Gainers (24h)</b>

${sortedPairs.map((pair, index) => {
  const priceChange = pair.priceChange24h ? `+${pair.priceChange24h.toFixed(2)}%` : 'N/A';
  const price = pair.lastPrice ? `$${pair.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : 'N/A';
  return `${index + 1}. <b>${pair.baseSymbol || 'Unknown'}</b> - ${priceChange} (${price})`;
}).join('\n')}

<i>Data provided by Vybe API</i>
`;
        
        // Delete loading message
        await ctx.deleteMessage(loadingMessage.message_id);
        
        // Send formatted response
        await ctx.reply(formattedResponse, {
          parse_mode: 'HTML'
        });
        
        // Send options for further actions
        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Refresh', 'market_top_gainers')
          ],
          [
            Markup.button.callback('🔙 Back to Market Data', 'research_market')
          ]
        ]);
        
        await ctx.reply('What would you like to do next?', {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (error) {
        // Delete loading message
        await ctx.deleteMessage(loadingMessage.message_id);
        
        // Send error message
        await ctx.reply(`
<b>❌ Error</b>

Failed to fetch top gainers.
Please try again later.
`, {
          parse_mode: 'HTML'
        });
        
        logger.error('Error fetching top gainers', { error, from: ctx.from?.id });
      }
    } catch (error) {
      logger.error('Error in market_top_gainers action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle top losers action
  bot.action('market_top_losers', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      // Send loading message
      const loadingMessage = await ctx.reply(`
<b>📉 Top Losers</b>

Fetching data...
`, {
        parse_mode: 'HTML'
      });
      
      try {
        // Get market pairs
        const marketPairsResponse = await vybeApi.getMarketPairs();
        
        // Sort by price change (ascending)
        const sortedPairs = [...marketPairsResponse.markets || []].filter(pair => 
          pair.priceChange24h !== undefined && pair.priceChange24h < 0
        ).sort((a, b) => 
          (a.priceChange24h || 0) - (b.priceChange24h || 0)
        ).slice(0, 10); // Get top 10
        
        // Format the response
        const formattedResponse = `
<b>📉 Top Losers (24h)</b>

${sortedPairs.map((pair, index) => {
  const priceChange = pair.priceChange24h ? `${pair.priceChange24h.toFixed(2)}%` : 'N/A';
  const price = pair.lastPrice ? `$${pair.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : 'N/A';
  return `${index + 1}. <b>${pair.baseSymbol || 'Unknown'}</b> - ${priceChange} (${price})`;
}).join('\n')}

<i>Data provided by Vybe API</i>
`;
        
        // Delete loading message
        await ctx.deleteMessage(loadingMessage.message_id);
        
        // Send formatted response
        await ctx.reply(formattedResponse, {
          parse_mode: 'HTML'
        });
        
        // Send options for further actions
        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Refresh', 'market_top_losers')
          ],
          [
            Markup.button.callback('🔙 Back to Market Data', 'research_market')
          ]
        ]);
        
        await ctx.reply('What would you like to do next?', {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (error) {
        // Delete loading message
        await ctx.deleteMessage(loadingMessage.message_id);
        
        // Send error message
        await ctx.reply(`
<b>❌ Error</b>

Failed to fetch top losers.
Please try again later.
`, {
          parse_mode: 'HTML'
        });
        
        logger.error('Error fetching top losers', { error, from: ctx.from?.id });
      }
    } catch (error) {
      logger.error('Error in market_top_losers action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle market pairs action
  bot.action('market_pairs', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      // Send loading message
      const loadingMessage = await ctx.reply(`
<b>🔄 Market Pairs</b>

Fetching data...
`, {
        parse_mode: 'HTML'
      });
      
      try {
        // Get market pairs
        const marketPairsResponse = await vybeApi.getMarketPairs();
        
        // Get top 10 pairs by volume
        const topPairs = [...marketPairsResponse.markets || []].sort((a, b) => 
          (b.volume24h || 0) - (a.volume24h || 0)
        ).slice(0, 10);
        
        // Format the response
        const formattedResponse = `
<b>🔄 Top Market Pairs</b>

${topPairs.map((pair, index) => {
  const price = pair.lastPrice ? `$${pair.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : 'N/A';
  const volume = pair.volume24h ? `$${(pair.volume24h).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'N/A';
  return `${index + 1}. <b>${pair.baseSymbol || 'Unknown'}/${pair.quoteSymbol || 'Unknown'}</b> - ${price} (Vol: ${volume})`;
}).join('\n')}

<i>Data provided by Vybe API</i>
`;
        
        // Delete loading message
        await ctx.deleteMessage(loadingMessage.message_id);
        
        // Send formatted response
        await ctx.reply(formattedResponse, {
          parse_mode: 'HTML'
        });
        
        // Send options for further actions
        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback('🔄 Refresh', 'market_pairs')
          ],
          [
            Markup.button.callback('🔙 Back to Market Data', 'research_market')
          ]
        ]);
        
        await ctx.reply('What would you like to do next?', {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (error) {
        // Delete loading message
        await ctx.deleteMessage(loadingMessage.message_id);
        
        // Send error message
        await ctx.reply(`
<b>❌ Error</b>

Failed to fetch market pairs.
Please try again later.
`, {
          parse_mode: 'HTML'
        });
        
        logger.error('Error fetching market pairs', { error, from: ctx.from?.id });
      }
    } catch (error) {
      logger.error('Error in market_pairs action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle protocol health action
  bot.action('research_protocol', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      await ctx.reply(`
<b>🏛 Protocol Health</b>

Please send a Solana program ID to analyze.
Example: <code>JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4</code> (Jupiter)
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
          const programId = ctx.message.text.trim();
          
          // Validate Solana program ID (base58 encoded, 32-44 chars)
          if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(programId)) {
            await ctx.reply('Invalid Solana program ID. Please try again.', {
              parse_mode: 'HTML'
            });
            return;
          }
          
          // Analyze program
          await analyzeProgram(ctx, programId);
          
          // Remove this listener
          return;
        }
        
        // Pass to next middleware
        return next();
      });
    } catch (error) {
      logger.error('Error in research_protocol action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Helper function to analyze a wallet
  const analyzeWallet = async (ctx: any, walletAddress: string) => {
    try {
      // Send loading message
      const loadingMessage = await ctx.reply(`
<b>💼 Analyzing Wallet</b>

Fetching data for wallet <code>${walletAddress}</code>...
`, {
        parse_mode: 'HTML'
      });
      
      // Get wallet summary
      const walletSummary = await vybeApi.getWalletSummary(walletAddress);
      
      // Format wallet summary
      const formattedSummary = formatWalletSummaryHTML(walletSummary);
      
      // Delete loading message
      await ctx.deleteMessage(loadingMessage.message_id);
      
      // Send wallet summary
      await ctx.reply(formattedSummary, {
        parse_mode: 'HTML'
      });
      
      // Send options for further analysis
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('📊 Detailed View', `wallet_detailed:${walletAddress}`),
          Markup.button.callback('🔄 Refresh', `analyze_wallet:${walletAddress}`)
        ],
        [
          Markup.button.callback('🔙 Back to Research', 'research')
        ]
      ]);
      
      await ctx.reply('What would you like to do next?', {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.info('Analyzed wallet', { walletAddress, from: ctx.from?.id });
    } catch (error) {
      logger.error('Error analyzing wallet', { error, walletAddress, from: ctx.from?.id });
      
      await ctx.reply(`
<b>❌ Error</b>

Failed to analyze wallet <code>${walletAddress}</code>.
Please check the address and try again.
`, {
        parse_mode: 'HTML'
      });
    }
  };
  
  // Helper function to analyze a token
  const analyzeToken = async (ctx: any, mintAddress: string) => {
    try {
      // Send loading message
      const loadingMessage = await ctx.reply(`
<b>🪙 Analyzing Token</b>

Fetching data for token <code>${mintAddress}</code>...
`, {
        parse_mode: 'HTML'
      });
      
      // Get token info
      const tokenInfo = await vybeApi.getDetailedTokenInfo(mintAddress);
      
      // Format token info
      const formattedInfo = formatTokenInfoHTML(tokenInfo);
      
      // Delete loading message
      await ctx.deleteMessage(loadingMessage.message_id);
      
      // Send token info
      await ctx.reply(formattedInfo, {
        parse_mode: 'HTML'
      });
      
      // Send options for further analysis
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('📊 Detailed View', `token_detailed:${mintAddress}`),
          Markup.button.callback('🔄 Refresh', `analyze_token:${mintAddress}`)
        ],
        [
          Markup.button.callback('🔙 Back to Research', 'research')
        ]
      ]);
      
      await ctx.reply('What would you like to do next?', {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.info('Analyzed token', { mintAddress, from: ctx.from?.id });
    } catch (error) {
      logger.error('Error analyzing token', { error, mintAddress, from: ctx.from?.id });
      
      await ctx.reply(`
<b>❌ Error</b>

Failed to analyze token <code>${mintAddress}</code>.
Please check the address and try again.
`, {
        parse_mode: 'HTML'
      });
    }
  };
  
  // Helper function to analyze a program
  const analyzeProgram = async (ctx: any, programId: string) => {
    try {
      // Send loading message
      const loadingMessage = await ctx.reply(`
<b>🏛 Analyzing Program</b>

Fetching data for program <code>${programId}</code>...
`, {
        parse_mode: 'HTML'
      });
      
      // Get program health
      const programHealth = await vybeApi.getProgramHealth(programId);
      
      // Format program health
      const formattedHealth = formatProgramHealthHTML(programHealth);
      
      // Delete loading message
      await ctx.deleteMessage(loadingMessage.message_id);
      
      // Send program health
      await ctx.reply(formattedHealth, {
        parse_mode: 'HTML'
      });
      
      // Send options for further analysis
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('📊 Detailed View', `program_detailed:${programId}`),
          Markup.button.callback('🔄 Refresh', `analyze_program:${programId}`)
        ],
        [
          Markup.button.callback('🔙 Back to Research', 'research')
        ]
      ]);
      
      await ctx.reply('What would you like to do next?', {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.info('Analyzed program', { programId, from: ctx.from?.id });
    } catch (error) {
      logger.error('Error analyzing program', { error, programId, from: ctx.from?.id });
      
      await ctx.reply(`
<b>❌ Error</b>

Failed to analyze program <code>${programId}</code>.
Please check the ID and try again.
`, {
        parse_mode: 'HTML'
      });
    }
  };
  
  // Handle back to research action
  bot.action('research', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('/research', { parse_mode: 'HTML' });
  });
  
  logger.info('Registered /research command');
};
