import { Telegraf, Context } from 'telegraf';
import { Markup } from 'telegraf';
import { User } from '../db/models/User';
import * as vybeApi from '../modules/vybeApi';
import { formatTokenInfoHTML, formatNumber } from '../utils/formatters';
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
          Markup.button.callback('📈 PNL Analysis', 'research_pnl'),
          Markup.button.callback('� Market Data', 'research_market')
        ],
        [
          Markup.button.callback('🏛 Protocol Health', 'research_protocol'),
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
            
            // Analyze wallet with extended information
            await analyzeWalletExtended(ctx, walletAddress);
            
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
      
      // Analyze wallet with extended information
      await analyzeWalletExtended(ctx, walletAddress);
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
          
          // Analyze wallet with extended information
          await analyzeWalletExtended(ctx, walletAddress);
          
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
        <div style="width:100%"><b>📊 Top Tokens by Volume (24h)</b></div>
        
        ${sortedTokens.length > 0 ?
          `<table width="100%" style="border-collapse:collapse">` +
          sortedTokens.map((token, index) => {
            const volume = `$${(token?.volume || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
            // Create rows with two tokens per row for better horizontal space usage
            if (index % 2 === 0) {
              // Start a new row for even indices
              const nextToken = index + 1 < sortedTokens.length ? sortedTokens[index + 1] : null;
              const nextVolume = nextToken ? `$${(nextToken?.volume || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '';
              
              return `<tr>
                <td width="50%">${index + 1}. <b>${token?.symbol || 'Unknown'}</b> - ${volume}</td>
                ${nextToken ? `<td width="50%">${index + 2}. <b>${nextToken?.symbol || 'Unknown'}</b> - ${nextVolume}</td>` : '<td width="50%"></td>'}
              </tr>`;
            }
            // Skip odd indices as they're handled with the even indices
            return '';
          }).filter(row => row !== '').join('') + `</table>` :
          'No volume data available at this time.'
        }
        
        <div style="width:100%"><i>Data provided by Vybe API</i></div>
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
        <div style="width:100%"><b>📈 Top Gainers (24h)</b></div>
        
        <table width="100%" style="border-collapse:collapse">
        ${sortedPairs.map((pair, index) => {
          const priceChange = pair.priceChange24h ? `+${pair.priceChange24h.toFixed(2)}%` : 'N/A';
          const price = pair.lastPrice ? `$${pair.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : 'N/A';
          
          // Create rows with two pairs per row
          if (index % 2 === 0) {
            // Start a new row for even indices
            const nextPair = index + 1 < sortedPairs.length ? sortedPairs[index + 1] : null;
            const nextPriceChange = nextPair && nextPair.priceChange24h ? `+${nextPair.priceChange24h.toFixed(2)}%` : 'N/A';
            const nextPrice = nextPair && nextPair.lastPrice ? `$${nextPair.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : 'N/A';
            
            return `<tr>
              <td width="50%">${index + 1}. <b>${pair.baseSymbol || 'Unknown'}</b> - ${priceChange} (${price})</td>
              ${nextPair ? `<td width="50%">${index + 2}. <b>${nextPair.baseSymbol || 'Unknown'}</b> - ${nextPriceChange} (${nextPrice})</td>` : '<td width="50%"></td>'}
            </tr>`;
          }
          // Skip odd indices as they're handled with the even indices
          return '';
        }).filter(row => row !== '').join('')}
        </table>
        
        <div style="width:100%"><i>Data provided by Vybe API</i></div>
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
        <div style="width:100%"><b>📉 Top Losers (24h)</b></div>
        
        <table width="100%" style="border-collapse:collapse">
        ${sortedPairs.map((pair, index) => {
          const priceChange = pair.priceChange24h ? `${pair.priceChange24h.toFixed(2)}%` : 'N/A';
          const price = pair.lastPrice ? `$${pair.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : 'N/A';
          
          // Create rows with two pairs per row
          if (index % 2 === 0) {
            // Start a new row for even indices
            const nextPair = index + 1 < sortedPairs.length ? sortedPairs[index + 1] : null;
            const nextPriceChange = nextPair && nextPair.priceChange24h ? `${nextPair.priceChange24h.toFixed(2)}%` : 'N/A';
            const nextPrice = nextPair && nextPair.lastPrice ? `$${nextPair.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : 'N/A';
            
            return `<tr>
              <td width="50%">${index + 1}. <b>${pair.baseSymbol || 'Unknown'}</b> - ${priceChange} (${price})</td>
              ${nextPair ? `<td width="50%">${index + 2}. <b>${nextPair.baseSymbol || 'Unknown'}</b> - ${nextPriceChange} (${nextPrice})</td>` : '<td width="50%"></td>'}
            </tr>`;
          }
          // Skip odd indices as they're handled with the even indices
          return '';
        }).filter(row => row !== '').join('')}
        </table>
        
        <div style="width:100%"><i>Data provided by Vybe API</i></div>
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
        <div style="width:100%"><b>🔄 Top Market Pairs</b></div>
        
        <table width="100%" style="border-collapse:collapse">
        ${topPairs.map((pair, index) => {
          const price = pair.lastPrice ? `$${pair.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : 'N/A';
          const volume = pair.volume24h ? `$${(pair.volume24h).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'N/A';
          
          // Create rows with two pairs per row
          if (index % 2 === 0) {
            // Start a new row for even indices
            const nextPair = index + 1 < topPairs.length ? topPairs[index + 1] : null;
            const nextPrice = nextPair && nextPair.lastPrice ? `$${nextPair.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : 'N/A';
            const nextVolume = nextPair && nextPair.volume24h ? `$${(nextPair.volume24h).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'N/A';
            
            return `<tr>
              <td width="50%">${index + 1}. <b>${pair.baseSymbol || 'Unknown'}/${pair.quoteSymbol || 'Unknown'}</b> - ${price} (Vol: ${volume})</td>
              ${nextPair ? `<td width="50%">${index + 2}. <b>${nextPair.baseSymbol || 'Unknown'}/${nextPair.quoteSymbol || 'Unknown'}</b> - ${nextPrice} (Vol: ${nextVolume})</td>` : '<td width="50%"></td>'}
            </tr>`;
          }
          // Skip odd indices as they're handled with the even indices
          return '';
        }).filter(row => row !== '').join('')}
        </table>
        
        <div style="width:100%"><i>Data provided by Vybe API</i></div>
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
  
  // Helper function to format PNL values with color and sign
  const formatPnlValue = (value: number): string => {
    const formattedValue = formatNumber(Math.abs(value));
    if (value > 0) {
      return `<span style="color:green">+$${formattedValue}</span>`;
    } else if (value < 0) {
      return `<span style="color:red">-$${formattedValue}</span>`;
    } else {
      return `$${formattedValue}`;
    }
  };
  
  // Helper function to analyze PNL for a wallet and token
  const analyzePnL = async (ctx: any, walletAddress: string, tokenAddress: string) => {
    try {
      // Send loading message
      const loadingMessage = await ctx.reply(`
<b>📈 Analyzing PNL</b>

Fetching PNL data for wallet <code>${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}</code> and token <code>${tokenAddress.substring(0, 4)}...${tokenAddress.substring(tokenAddress.length - 4)}</code>...
`, {
        parse_mode: 'HTML'
      });
      
      // Get token info to display the symbol
      let tokenSymbol = 'Unknown';
      try {
        const tokenInfo = await vybeApi.getTokenInfo(tokenAddress);
        tokenSymbol = tokenInfo.symbol || 'Unknown';
      } catch (error) {
        logger.debug(`Failed to fetch token info for ${tokenAddress}`, { error });
      }
      
      // Get PNL data for different timeframes
      const [pnl1d, pnl7d, pnl30d] = await Promise.all([
        vybeApi.getWalletPnL(walletAddress, tokenAddress, "1d")
          .catch(error => {
            logger.debug(`Failed to fetch 1d PNL for wallet ${walletAddress} and token ${tokenAddress}`, { error });
            return { summary: { realizedPnlUsd: 0, unrealizedPnlUsd: 0 } };
          }),
        
        vybeApi.getWalletPnL(walletAddress, tokenAddress, "7d")
          .catch(error => {
            logger.debug(`Failed to fetch 7d PNL for wallet ${walletAddress} and token ${tokenAddress}`, { error });
            return { summary: { realizedPnlUsd: 0, unrealizedPnlUsd: 0 } };
          }),
        
        vybeApi.getWalletPnL(walletAddress, tokenAddress, "30d")
          .catch(error => {
            logger.debug(`Failed to fetch 30d PNL for wallet ${walletAddress} and token ${tokenAddress}`, { error });
            return { summary: { realizedPnlUsd: 0, unrealizedPnlUsd: 0 } };
          })
      ]);
      
      // Extract summary data
      const summary1d = pnl1d.summary || {};
      const summary7d = pnl7d.summary || {};
      const summary30d = pnl30d.summary || {};
      
      // Build the PNL analysis message with table-based layout
      let message = `<div style="width:100%"><b>📈 PNL Analysis</b></div>\n\n`;
      
      // Wallet and token info in a table
      message += `<table width="100%" style="border-collapse:collapse">
        <tr>
          <td width="50%"><b>Wallet:</b> <code>${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}</code></td>
          <td width="50%"><b>Token:</b> ${tokenSymbol} (<code>${tokenAddress.substring(0, 4)}...${tokenAddress.substring(tokenAddress.length - 4)}</code>)</td>
        </tr>
      </table>\n\n`;
      
      // PNL Summary with table layout
      message += `<div style="width:100%"><b>PNL Summary</b></div>\n`;
      message += `<table width="100%" style="border-collapse:collapse">`;
      
      // 1-day PNL
      const realized1d = summary1d.realizedPnlUsd || 0;
      const unrealized1d = summary1d.unrealizedPnlUsd || 0;
      const total1d = realized1d + unrealized1d;
      message += `<tr>
        <td width="20%"><b>1-day:</b></td>
        <td width="25%">Total: ${formatPnlValue(total1d)}</td>
        <td width="55%">Realized: ${formatPnlValue(realized1d)}, Unrealized: ${formatPnlValue(unrealized1d)}</td>
      </tr>`;
      
      // 7-day PNL
      const realized7d = summary7d.realizedPnlUsd || 0;
      const unrealized7d = summary7d.unrealizedPnlUsd || 0;
      const total7d = realized7d + unrealized7d;
      message += `<tr>
        <td width="20%"><b>7-day:</b></td>
        <td width="25%">Total: ${formatPnlValue(total7d)}</td>
        <td width="55%">Realized: ${formatPnlValue(realized7d)}, Unrealized: ${formatPnlValue(unrealized7d)}</td>
      </tr>`;
      
      // 30-day PNL
      const realized30d = summary30d.realizedPnlUsd || 0;
      const unrealized30d = summary30d.unrealizedPnlUsd || 0;
      const total30d = realized30d + unrealized30d;
      message += `<tr>
        <td width="20%"><b>30-day:</b></td>
        <td width="25%">Total: ${formatPnlValue(total30d)}</td>
        <td width="55%">Realized: ${formatPnlValue(realized30d)}, Unrealized: ${formatPnlValue(unrealized30d)}</td>
      </tr>`;
      
      message += `</table>\n`;
      
      // Trading Stats (if available) with table layout
      if (summary7d.winRate !== undefined || summary7d.tradesCount !== undefined) {
        message += `\n<div style="width:100%"><b>Trading Stats (7-day)</b></div>\n`;
        message += `<table width="100%" style="border-collapse:collapse">`;
        
        // First row with win rate and trades count
        if (summary7d.winRate !== undefined || summary7d.tradesCount !== undefined) {
          message += `<tr>`;
          
          if (summary7d.winRate !== undefined) {
            message += `<td width="50%"><b>Win Rate:</b> ${summary7d.winRate.toFixed(2)}%</td>`;
          } else {
            message += `<td width="50%"></td>`;
          }
          
          if (summary7d.tradesCount !== undefined) {
            message += `<td width="50%"><b>Trades:</b> ${summary7d.tradesCount}</td>`;
          } else {
            message += `<td width="50%"></td>`;
          }
          
          message += `</tr>`;
        }
        
        // Second row with winning/losing trades and average trade size
        if (summary7d.winningTradesCount !== undefined || summary7d.averageTradeUsd !== undefined) {
          message += `<tr>`;
          
          if (summary7d.winningTradesCount !== undefined && summary7d.losingTradesCount !== undefined) {
            message += `<td width="50%"><b>Winning/Losing Trades:</b> ${summary7d.winningTradesCount}/${summary7d.losingTradesCount}</td>`;
          } else {
            message += `<td width="50%"></td>`;
          }
          
          if (summary7d.averageTradeUsd !== undefined) {
            message += `<td width="50%"><b>Average Trade Size:</b> $${formatNumber(summary7d.averageTradeUsd)}</td>`;
          } else {
            message += `<td width="50%"></td>`;
          }
          
          message += `</tr>`;
        }
        
        // Third row with trading volume
        if (summary7d.tradesVolumeUsd !== undefined) {
          message += `<tr>
            <td width="100%" colspan="2"><b>Trading Volume:</b> $${formatNumber(summary7d.tradesVolumeUsd)}</td>
          </tr>`;
        }
        
        message += `</table>\n`;
      }
      
      // PNL Trend (if available) with table layout
      if (summary7d.pnlTrendSevenDays && Array.isArray(summary7d.pnlTrendSevenDays) && summary7d.pnlTrendSevenDays.length > 0) {
        message += `\n<div style="width:100%"><b>7-day PNL Trend</b></div>\n`;
        message += `<table width="100%" style="border-collapse:collapse">`;
        
        // Create rows with multiple data points per row for better horizontal space usage
        for (let i = 0; i < summary7d.pnlTrendSevenDays.length; i += 2) {
          message += `<tr>`;
          
          // First data point
          const date1 = new Date(summary7d.pnlTrendSevenDays[i][0]);
          const pnl1 = summary7d.pnlTrendSevenDays[i][1];
          const formattedDate1 = `${date1.getMonth() + 1}/${date1.getDate()}`;
          message += `<td width="50%"><b>${formattedDate1}:</b> ${formatPnlValue(pnl1)}</td>`;
          
          // Second data point (if exists)
          if (i + 1 < summary7d.pnlTrendSevenDays.length) {
            const date2 = new Date(summary7d.pnlTrendSevenDays[i + 1][0]);
            const pnl2 = summary7d.pnlTrendSevenDays[i + 1][1];
            const formattedDate2 = `${date2.getMonth() + 1}/${date2.getDate()}`;
            message += `<td width="50%"><b>${formattedDate2}:</b> ${formatPnlValue(pnl2)}</td>`;
          } else {
            message += `<td width="50%"></td>`;
          }
          
          message += `</tr>`;
        }
        
        message += `</table>\n`;
      }
      
      // Delete loading message
      await ctx.deleteMessage(loadingMessage.message_id);
      
      // Send PNL analysis
      await ctx.reply(message, {
        parse_mode: 'HTML'
      });
      
      // Send options for further analysis
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('🔄 Refresh', `pnl_token:${walletAddress}:${tokenAddress}`),
          Markup.button.callback('📊 Different Token', `enter_pnl_token:${walletAddress}`)
        ],
        [
          Markup.button.callback('🔙 Back to Research', 'research')
        ]
      ]);
      
      await ctx.reply('What would you like to do next?', {
        parse_mode: 'HTML',
        ...keyboard
      });
      
      logger.info('Analyzed PNL', { walletAddress, tokenAddress, from: ctx.from?.id });
    } catch (error) {
      logger.error('Error analyzing PNL', { error, walletAddress, tokenAddress, from: ctx.from?.id });
      
      await ctx.reply(`
<b>❌ Error</b>

Failed to analyze PNL for wallet <code>${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}</code> and token <code>${tokenAddress.substring(0, 4)}...${tokenAddress.substring(tokenAddress.length - 4)}</code>.
Please check the addresses and try again.
`, {
        parse_mode: 'HTML'
      });
    }
  };
  
  // Helper function to request token address for PNL analysis
  const requestTokenAddressForPnL = async (ctx: any, walletAddress: string) => {
    try {
      // First, get the wallet tokens to show as options
      const loadingMessage = await ctx.reply(`
<b>📈 PNL Analysis</b>

Fetching tokens for wallet <code>${walletAddress}</code>...
`, {
        parse_mode: 'HTML'
      });
      
      // Get token balances
      const tokenBalanceResponse = await vybeApi.getTokenBalance(walletAddress);
      
      // Process token data from the response
      const tokenData = tokenBalanceResponse && typeof tokenBalanceResponse === 'object' && 'data' in tokenBalanceResponse ? 
        (tokenBalanceResponse.data && typeof tokenBalanceResponse.data === 'object' && 'data' in tokenBalanceResponse.data && Array.isArray(tokenBalanceResponse.data.data) ? 
          tokenBalanceResponse.data.data : 
          (Array.isArray(tokenBalanceResponse.data) ? tokenBalanceResponse.data : [])
        ) : [];
      
      // Delete loading message
      await ctx.deleteMessage(loadingMessage.message_id);
      
      if (tokenData.length > 0) {
        // Sort tokens by USD value (descending)
        const sortedTokens = [...tokenData].sort((a, b) => 
          parseFloat(b.valueUsd || '0') - parseFloat(a.valueUsd || '0')
        );
        
        // Create buttons for top tokens (max 5)
        const topTokens = sortedTokens.slice(0, 5);
        const buttons = topTokens.map(token => [
          Markup.button.callback(
            `${token.symbol || 'Unknown'} (${token.mintAddress.substring(0, 4)}...${token.mintAddress.substring(token.mintAddress.length - 4)})`, 
            `pnl_token:${walletAddress}:${token.mintAddress}`
          )
        ]);
        
        // Add option to enter a different token
        buttons.push([Markup.button.callback('Enter a different token', `enter_pnl_token:${walletAddress}`)]);
        
        // Add back button
        buttons.push([Markup.button.callback('🔙 Back to Research', 'research')]);
        
        const keyboard = Markup.inlineKeyboard(buttons);
        
        await ctx.reply(`
<b>📈 PNL Analysis</b>

Select a token to analyze PNL for wallet <code>${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}</code>:
`, {
          parse_mode: 'HTML',
          ...keyboard
        });
      } else {
        // No tokens found, ask for manual token address
        await ctx.reply(`
<b>📈 PNL Analysis</b>

No tokens found in wallet <code>${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}</code>.

Please send a Solana token address to analyze PNL.
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
            const tokenAddress = ctx.message.text.trim();
            
            // Validate Solana token address (base58 encoded, 32-44 chars)
            if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
              await ctx.reply('Invalid Solana token address. Please try again.', {
                parse_mode: 'HTML'
              });
              return;
            }
            
            // Analyze PNL for the wallet and token
            await analyzePnL(ctx, walletAddress, tokenAddress);
            
            // Remove this listener
            return;
          }
          
          // Pass to next middleware
          return next();
        });
      }
    } catch (error) {
      logger.error('Error requesting token address for PNL', { error, walletAddress, from: ctx.from?.id });
      
      await ctx.reply(`
<b>❌ Error</b>

Failed to fetch tokens for wallet <code>${walletAddress}</code>.
Please send a Solana token address directly to analyze PNL.
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
          const tokenAddress = ctx.message.text.trim();
          
          // Validate Solana token address (base58 encoded, 32-44 chars)
          if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
            await ctx.reply('Invalid Solana token address. Please try again.', {
              parse_mode: 'HTML'
            });
            return;
          }
          
          // Analyze PNL for the wallet and token
          await analyzePnL(ctx, walletAddress, tokenAddress);
          
          // Remove this listener
          return;
        }
        
        // Pass to next middleware
        return next();
      });
    }
  };
  
  // Handle PNL analysis action
  bot.action('research_pnl', async (ctx) => {
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
<b>📈 PNL Analysis</b>

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
            
            // Proceed to ask for token address
            await requestTokenAddressForPnL(ctx, walletAddress);
            
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
        Markup.button.callback(`${wallet.substring(0, 4)}...${wallet.substring(wallet.length - 4)}`, `pnl_wallet:${wallet}`)
      ]);
      
      // Add option to enter a different wallet
      buttons.push([Markup.button.callback('Enter a different wallet', 'enter_pnl_wallet')]);
      
      // Add back button
      buttons.push([Markup.button.callback('🔙 Back to Research', 'research')]);
      
      const keyboard = Markup.inlineKeyboard(buttons);
      
      await ctx.reply(`
<b>📈 PNL Analysis</b>

Select a wallet to analyze:
`, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (error) {
      logger.error('Error in research_pnl action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle PNL wallet selection
  bot.action(/^pnl_wallet:(.+)$/, async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const match = ctx.match[1];
      const walletAddress = match;
      
      // Proceed to ask for token address
      await requestTokenAddressForPnL(ctx, walletAddress);
    } catch (error) {
      logger.error('Error in pnl_wallet action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle enter PNL wallet action
  bot.action('enter_pnl_wallet', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      await ctx.reply(`
<b>📈 PNL Analysis</b>

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
          
          // Proceed to ask for token address
          await requestTokenAddressForPnL(ctx, walletAddress);
          
          // Remove this listener
          return;
        }
        
        // Pass to next middleware
        return next();
      });
    } catch (error) {
      logger.error('Error in enter_pnl_wallet action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle PNL token selection
  bot.action(/^pnl_token:(.+):(.+)$/, async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const walletAddress = ctx.match[1];
      const tokenAddress = ctx.match[2];
      
      // Analyze PNL for the wallet and token
      await analyzePnL(ctx, walletAddress, tokenAddress);
    } catch (error) {
      logger.error('Error in pnl_token action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle enter PNL token action
  bot.action(/^enter_pnl_token:(.+)$/, async (ctx) => {
    try {
      ctx.answerCbQuery();
      
      const walletAddress = ctx.match[1];
      
      await ctx.reply(`
<b>📈 PNL Analysis</b>

Please send a Solana token address to analyze PNL for wallet <code>${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}</code>.
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
          const tokenAddress = ctx.message.text.trim();
          
          // Validate Solana token address (base58 encoded, 32-44 chars)
          if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
            await ctx.reply('Invalid Solana token address. Please try again.', {
              parse_mode: 'HTML'
            });
            return;
          }
          
          // Analyze PNL for the wallet and token
          await analyzePnL(ctx, walletAddress, tokenAddress);
          
          // Remove this listener
          return;
        }
        
        // Pass to next middleware
        return next();
      });
    } catch (error) {
      logger.error('Error in enter_pnl_token action', { error, from: ctx.from?.id });
      
      await ctx.reply('An error occurred while processing your request. Please try again.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Handle back to research action
  bot.action('research', async (ctx) => {
    try {
      ctx.answerCbQuery();
      
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
          Markup.button.callback('📈 PNL Analysis', 'research_pnl'),
          Markup.button.callback('� Market Data', 'research_market')
        ],
        [
          Markup.button.callback('🏛 Protocol Health', 'research_protocol'),
          Markup.button.callback('🔙 Back to Main Menu', 'back_to_main')
        ]
      ]);

      await ctx.reply(researchMessage, {
        parse_mode: 'HTML',
        ...keyboard
      });
    } catch (error) {
      logger.error('Error in back to research action', { error, from: ctx.from?.id });
      await ctx.reply('An error occurred while returning to the Research menu.', {
        parse_mode: 'HTML'
      });
    }
  });
  
  // Helper function to analyze a wallet with extended information

  const analyzeWalletExtended = async (ctx: any, walletAddress: string) => {
    try {
      logger.debug('Starting extended wallet analysis', { walletAddress });
      // Send loading message
      const loadingMessage = await ctx.reply(`
<b>💼 Analyzing Wallet</b>

Fetching extended data for wallet <code>${walletAddress}</code>...
`, {
        parse_mode: 'HTML'
      });
      
      // Get wallet summary first as this is the most reliable endpoint
      const walletSummary = await vybeApi.getWalletSummary(walletAddress);
      
      // Fetch all other data in parallel, with proper error handling for each endpoint
      const [knownAccountResponse, pnl1d, pnl7d, pnl30d, tsBalanceResponse, currentBalances] = await Promise.all([
        // 1. Known Accounts - may not be available for all wallets
        vybeApi.getKnownAccounts({ ownerAddress: walletAddress })
          .catch(error => {
            logger.debug(`Failed to fetch known accounts for wallet ${walletAddress}`, { error });
            return { data: [] };
          }),
        
        // 2. Wallet PnL for different timeframes
        vybeApi.getWalletPnL(walletAddress, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "1d")
          .catch(error => {
            logger.debug(`Failed to fetch 1d PnL for wallet ${walletAddress}`, { error });
            return { realizedPnlUsd: 0, unrealizedPnlUsd: 0 };
          }),
        
        vybeApi.getWalletPnL(walletAddress, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "7d")
          .catch(error => {
            logger.debug(`Failed to fetch 7d PnL for wallet ${walletAddress}`, { error });
            return { realizedPnlUsd: 0, unrealizedPnlUsd: 0 };
          }),
        
        vybeApi.getWalletPnL(walletAddress, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "30d")
          .catch(error => {
            logger.debug(`Failed to fetch 30d PnL for wallet ${walletAddress}`, { error });
            return { realizedPnlUsd: 0, unrealizedPnlUsd: 0 };
          }),
        
        // 3. Time-Series Balances (last 14 days)
        vybeApi.getWalletTokensTS({
          ownerAddress: walletAddress,
          days: 14
        }).catch(error => {
          logger.debug(`Failed to fetch time-series balances for wallet ${walletAddress}`, { error });
          return { data: [] };
        }),
        
        // 4. Current Token Balances (as backup if wallet summary doesn't have tokens)
        vybeApi.getTokenBalance(walletAddress)
          .catch(error => {
            logger.debug(`Failed to fetch token balances for wallet ${walletAddress}`, { error });
            return { data: [] };
          })
      ]);
      
      // Extract data from known accounts response (if available)
      const knownLabels = knownAccountResponse?.data?.[0]?.labels || [];
      const entityName = knownAccountResponse?.data?.[0]?.entityName || null;
      const friendlyName = knownAccountResponse?.data?.[0]?.name || null;
      
      // Build a detailed summary message with table-based layout
      let message = `<div style="width:100%"><b>🔍 Extended Wallet Analysis</b></div>\n\n`;
      
      // Basic wallet info in a table
      message += `<table width="100%" style="border-collapse:collapse">
        <tr>
          <td width="100%"><b>Address:</b> <code>${walletAddress}</code></td>
        </tr>`;
      
      // If known labels or entity
      if (knownLabels.length > 0) {
        message += `<tr>
          <td width="100%"><b>Labels:</b> ${knownLabels.join(', ')}</td>
        </tr>`;
      }
      if (friendlyName) {
        message += `<tr>
          <td width="100%"><b>Friendly Name:</b> ${friendlyName}</td>
        </tr>`;
      }
      if (entityName) {
        message += `<tr>
          <td width="100%"><b>Entity:</b> ${entityName}</td>
        </tr>`;
      }
      
      // Add total USD value from wallet summary or recalc fallback
      let totalUsdValue: number;
      if (walletSummary.totalUsdValue !== undefined) {
        totalUsdValue = walletSummary.totalUsdValue;
      } else {
        const tokenDataArr: any[] = currentBalances && currentBalances.data && Array.isArray(currentBalances.data.data)
          ? currentBalances.data.data
          : (Array.isArray(currentBalances.data) ? currentBalances.data : []);
        totalUsdValue = tokenDataArr.reduce((sum: number, token: any) => sum + parseFloat(token.valueUsd || '0'), 0);
        logger.debug('Recalculated totalUsdValue from token array', { totalUsdValue });
      }
      message += `<tr>
        <td width="100%"><b>Total USD Value:</b> <code>$${formatNumber(totalUsdValue)}</code></td>
      </tr>`;
      
      message += `</table>\n`;
      
      // PnL data in a table
      message += `\n<div style="width:100%"><b>📈 PnL & Trading Stats</b></div>\n`;
      message += `<table width="100%" style="border-collapse:collapse">
        <tr>
          <td width="50%"><b>1d Realized PnL:</b> $${formatNumber(pnl1d.realizedPnlUsd || 0)}</td>
          <td width="50%"><b>7d Realized PnL:</b> $${formatNumber(pnl7d.realizedPnlUsd || 0)}</td>
        </tr>
        <tr>
          <td width="50%"><b>30d Realized PnL:</b> $${formatNumber(pnl30d.realizedPnlUsd || 0)}</td>`;
      
      // Unrealized PnL if available
      if (pnl7d.unrealizedPnlUsd !== undefined) {
        message += `<td width="50%"><b>7d Unrealized PnL:</b> $${formatNumber(pnl7d.unrealizedPnlUsd || 0)}</td>`;
      } else {
        message += `<td width="50%"></td>`;
      }
      
      message += `</tr>
      </table>\n`;
      
      // Highlight big winners/losers from the PnL token breakdown if available with table layout
      if (pnl7d.tokens && Array.isArray(pnl7d.tokens) && pnl7d.tokens.length > 0) {
        // Sort by realizedPnlUsd desc, pick top 3
        const sortedByPnl = [...pnl7d.tokens].sort((a, b) =>
          (b.realizedPnlUsd || 0) - (a.realizedPnlUsd || 0)
        );
        
        const topGainers = sortedByPnl.slice(0, 3);
        if (topGainers.length > 0) {
          message += `\n<div style="width:100%"><b>Top Gainers (7d):</b></div>\n`;
          message += `<table width="100%" style="border-collapse:collapse">`;
          
          // Create rows with two tokens per row
          for (let i = 0; i < topGainers.length; i += 2) {
            message += `<tr>`;
            
            // First token
            message += `<td width="50%"><b>${topGainers[i].tokenSymbol || 'Unknown'}:</b> $${formatNumber(topGainers[i].realizedPnlUsd || 0)}</td>`;
            
            // Second token (if exists)
            if (i + 1 < topGainers.length) {
              message += `<td width="50%"><b>${topGainers[i+1].tokenSymbol || 'Unknown'}:</b> $${formatNumber(topGainers[i+1].realizedPnlUsd || 0)}</td>`;
            } else {
              message += `<td width="50%"></td>`;
            }
            
            message += `</tr>`;
          }
          
          message += `</table>\n`;
        }
        
        const topLosers = sortedByPnl.slice(-3).reverse().filter(t => t.realizedPnlUsd < 0); // last 3 with negative PnL
        if (topLosers.length > 0) {
          message += `\n<div style="width:100%"><b>Top Losers (7d):</b></div>\n`;
          message += `<table width="100%" style="border-collapse:collapse">`;
          
          // Create rows with two tokens per row
          for (let i = 0; i < topLosers.length; i += 2) {
            message += `<tr>`;
            
            // First token
            message += `<td width="50%"><b>${topLosers[i].tokenSymbol || 'Unknown'}:</b> $${formatNumber(topLosers[i].realizedPnlUsd || 0)}</td>`;
            
            // Second token (if exists)
            if (i + 1 < topLosers.length) {
              message += `<td width="50%"><b>${topLosers[i+1].tokenSymbol || 'Unknown'}:</b> $${formatNumber(topLosers[i+1].realizedPnlUsd || 0)}</td>`;
            } else {
              message += `<td width="50%"></td>`;
            }
            
            message += `</tr>`;
          }
          
          message += `</table>\n`;
        }
      }
      
      // Time-Series snippet if available
      if (tsBalanceResponse && tsBalanceResponse.data && Array.isArray(tsBalanceResponse.data) && tsBalanceResponse.data.length > 0) {
        message += `\n<b>📅 14d Balance Trend</b>\n`;
        
        // Try to identify significant changes in token balances
        try {
          // Get first and last day data points
          const firstDay = tsBalanceResponse.data[0];
          const lastDay = tsBalanceResponse.data[tsBalanceResponse.data.length - 1];
          
          // Compare token balances
          if (firstDay.tokens && lastDay.tokens) {
            const tokenChanges: Array<{
              symbol: string;
              balanceChange: number;
              valueChange: number;
              isNew?: boolean;
            }> = [];
            
            // Create a map of token balances from the first day
            const firstDayTokens = new Map();
            firstDay.tokens.forEach((token: any) => {
              firstDayTokens.set(token.mintAddress, {
                symbol: token.symbol,
                balance: parseFloat(token.amount || '0'),
                valueUsd: parseFloat(token.valueUsd || '0')
              });
            });
            
            // Compare with last day tokens
            lastDay.tokens.forEach((token: any) => {
              const firstDayToken = firstDayTokens.get(token.mintAddress);
              const lastDayBalance = parseFloat(token.amount || '0');
              const lastDayValueUsd = parseFloat(token.valueUsd || '0');
              
              if (firstDayToken) {
                // Token exists in both days, calculate change
                const balanceChange = lastDayBalance - firstDayToken.balance;
                const valueChange = lastDayValueUsd - firstDayToken.valueUsd;
                
                // Only include significant changes
                if (Math.abs(valueChange) > 10) {
                  tokenChanges.push({
                    symbol: token.symbol,
                    balanceChange,
                    valueChange
                  });
                }
              } else if (lastDayValueUsd > 10) {
                // New token with significant value
                tokenChanges.push({
                  symbol: token.symbol,
                  balanceChange: lastDayBalance,
                  valueChange: lastDayValueUsd,
                  isNew: true
                });
              }
            });
            
            // Sort by absolute value change
            tokenChanges.sort((a, b) => Math.abs(b.valueChange) - Math.abs(a.valueChange));
            
            // Show top 3 changes
            const topChanges = tokenChanges.slice(0, 3);
            if (topChanges.length > 0) {
              topChanges.forEach(change => {
                const changePrefix = change.isNew ? 'New position' : (change.balanceChange > 0 ? 'Increased' : 'Decreased');
                const changeEmoji = change.valueChange > 0 ? '🟢' : '🔴';
                message += `• ${changeEmoji} ${changePrefix}: ${change.symbol} $${formatNumber(Math.abs(change.valueChange))}\n`;
              });
            } else {
              message += `• No significant balance changes in the last 14 days\n`;
            }
          }
        } catch (error) {
          logger.error('Error processing time-series data', { error });
          message += `• Unable to analyze balance trends\n`;
        }
      }
      
      // Current Balances (top 5 by USD value) with table layout
      if (currentBalances && currentBalances.data) {
        message += `\n<div style="width:100%"><b>💰 Current Balances</b></div>\n`;
        
        // Process token data from the response
        const tokenData = currentBalances && typeof currentBalances === 'object' && 'data' in currentBalances ?
          (currentBalances.data && typeof currentBalances.data === 'object' && 'data' in currentBalances.data && Array.isArray(currentBalances.data.data) ?
            currentBalances.data.data :
            (Array.isArray(currentBalances.data) ? currentBalances.data : [])
          ) : [];
        
        if (tokenData.length > 0) {
          // Sort by valueUsd desc
          const sortedTokens = [...tokenData].sort((a, b) =>
            parseFloat(b.valueUsd || '0') - parseFloat(a.valueUsd || '0')
          );
          
          const topTokens = sortedTokens.slice(0, 5);
          
          message += `<table width="100%" style="border-collapse:collapse">`;
          
          // Create rows with two tokens per row
          for (let i = 0; i < topTokens.length; i += 2) {
            message += `<tr>`;
            
            // First token
            const amount1 = parseFloat(topTokens[i].amount || '0');
            const valueUsd1 = parseFloat(topTokens[i].valueUsd || '0');
            message += `<td width="50%"><b>${topTokens[i].symbol || 'Unknown'}:</b> ${formatNumber(amount1)} ($${formatNumber(valueUsd1)})</td>`;
            
            // Second token (if exists)
            if (i + 1 < topTokens.length) {
              const amount2 = parseFloat(topTokens[i+1].amount || '0');
              const valueUsd2 = parseFloat(topTokens[i+1].valueUsd || '0');
              message += `<td width="50%"><b>${topTokens[i+1].symbol || 'Unknown'}:</b> ${formatNumber(amount2)} ($${formatNumber(valueUsd2)})</td>`;
            } else {
              message += `<td width="50%"></td>`;
            }
            
            message += `</tr>`;
          }
          
          message += `</table>`;
          
          if (tokenData.length > 5) {
            message += `<div style="width:100%">...and ${tokenData.length - 5} more tokens.</div>\n`;
          }
        } else {
          message += `<div style="width:100%">• No token balances found</div>\n`;
        }
      }
      
      // Delete loading message
      try {
        await ctx.deleteMessage(loadingMessage.message_id);
      } catch (telegramError) {
        logger.warn('Failed to delete loading message', { error: telegramError });
      }
      
      // Send extended wallet analysis in chunks to avoid Telegram limits
      try {
        const sanitizedMessage = message
          .replace(/<div[^>]*>/g, '')
          .replace(/<\/div>/g, '\n')
          .replace(/<table[^>]*>/g, '')
          .replace(/<\/table>/g, '\n')
          .replace(/<tr>/g, '')
          .replace(/<\/tr>/g, '\n')
          .replace(/<td[^>]*>/g, '')
          .replace(/<\/td>/g, ' ')
          .trim();
        const maxMessageLength = 4000;
        let offset = 0;
        while (offset < sanitizedMessage.length) {
          const chunk = sanitizedMessage.slice(offset, offset + maxMessageLength);
          await ctx.reply(chunk, { parse_mode: 'HTML' });
          offset += maxMessageLength;
        }
      } catch (telegramError) {
        logger.warn('Failed to send extended wallet analysis', { error: telegramError });
      }
      
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
      
      try {
        await ctx.reply('What would you like to do next?', {
          parse_mode: 'HTML',
          ...keyboard
        });
      } catch (telegramError) {
        logger.warn('Failed to send next actions keyboard', { error: telegramError });
      }
      
      logger.info('Analyzed wallet with extended data', { walletAddress, from: ctx.from?.id });
    } catch (error) {
      logger.error('Error analyzing wallet with extended data', { error, walletAddress, from: ctx.from?.id });
      
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
  
  logger.info('Registered /research command');
};
