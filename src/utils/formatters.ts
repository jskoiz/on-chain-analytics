import { FormattedWalletSummary, FormattedTokenInfo, FormattedProgramHealth } from '../modules/vybeApi';

/**
 * Escapes HTML special characters to prevent injection
 * @param text Text to escape
 * @returns Escaped text
 */
export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Formats a number with commas as thousands separators
 * @param num Number to format
 * @param decimals Number of decimal places
 * @returns Formatted number string
 */
export const formatNumber = (num: number, decimals = 2): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Formats a percentage change with + or - sign
 * @param change Percentage change
 * @param decimals Number of decimal places
 * @returns Formatted percentage string with sign
 */
export const formatPercentage = (change: number | undefined, decimals = 2): string => {
  if (change === undefined || change === null) {
    return 'N/A';
  }
  
  const sign = change >= 0 ? '+' : '';
  return `${sign}${formatNumber(change, decimals)}%`;
};

/**
 * Formats a Solana address for display (truncates middle)
 * @param address Solana address
 * @returns Truncated address
 */
export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) {
    return address;
  }
  
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
};

/**
 * Formats a wallet summary into HTML
 * @param summary Wallet summary data
 * @param detailed Whether to include detailed information
 * @returns HTML-formatted wallet summary
 */
export const formatWalletSummaryHTML = (
  summary: FormattedWalletSummary,
  detailed = false
): string => {
  // Basic wallet info
  let html = `<b>📊 Wallet Summary</b>\n\n`;
  html += `<b>Address:</b> <code>${formatAddress(summary.owner)}</code>\n`;
  html += `<b>SOL Balance:</b> <code>${formatNumber(summary.solBalance)}</code>\n`;
  
  if (summary.totalUsdValue !== undefined) {
    html += `<b>Total USD Value:</b> <code>$${formatNumber(summary.totalUsdValue)}</code>\n\n`;
  } else {
    html += '\n';
  }
  
  // Token balances
  if (summary.tokens.length > 0) {
    html += `<b>🪙 Tokens (${summary.tokens.length})</b>\n`;
    
    // Sort tokens by USD value (if available)
    const sortedTokens = [...summary.tokens].sort((a, b) => 
      (b.usdValue || 0) - (a.usdValue || 0)
    );
    
    // Limit to top 10 tokens for basic view
    const tokensToShow = detailed ? sortedTokens : sortedTokens.slice(0, 10);
    
    tokensToShow.forEach(token => {
      html += `• <b>${escapeHtml(token.symbol)}</b>: <code>${formatNumber(token.balance)}</code>`;
      
      if (token.usdValue) {
        html += ` ($${formatNumber(token.usdValue)})\n`;
      } else {
        html += '\n';
      }
    });
    
    if (!detailed && summary.tokens.length > 10) {
      html += `<i>...and ${summary.tokens.length - 10} more tokens</i>\n`;
    }
    
    html += '\n';
  }
  
  // NFT balances
  if (summary.nfts.length > 0) {
    html += `<b>🖼 NFTs (${summary.nfts.length})</b>\n`;
    
    // Limit to top 5 NFTs for basic view
    const nftsToShow = detailed ? summary.nfts : summary.nfts.slice(0, 5);
    
    nftsToShow.forEach(nft => {
      html += `• <b>${escapeHtml(nft.name)}</b>`;
      
      if (nft.collection) {
        html += ` (${escapeHtml(nft.collection)})`;
      }
      
      html += '\n';
    });
    
    if (!detailed && summary.nfts.length > 5) {
      html += `<i>...and ${summary.nfts.length - 5} more NFTs</i>\n`;
    }
  }
  
  return html;
};

/**
 * Formats token information into HTML
 * @param tokenInfo Token information
 * @param detailed Whether to include detailed information
 * @returns HTML-formatted token information
 */
export const formatTokenInfoHTML = (
  tokenInfo: FormattedTokenInfo,
  detailed = false
): string => {
  let html = `<b>🪙 Token Information</b>\n\n`;
  
  // Basic token info
  html += `<b>Name:</b> ${escapeHtml(tokenInfo.name)}\n`;
  html += `<b>Symbol:</b> ${escapeHtml(tokenInfo.symbol)}\n`;
  html += `<b>Mint:</b> <code>${formatAddress(tokenInfo.mint)}</code>\n`;
  html += `<b>Decimals:</b> ${tokenInfo.decimals}\n`;
  html += `<b>Supply:</b> ${formatNumber(tokenInfo.supply)}\n`;
  html += `<b>Holders:</b> ${formatNumber(tokenInfo.holders, 0)}\n\n`;
  
  // Price information
  if (tokenInfo.price) {
    html += `<b>💰 Price Information</b>\n`;
    html += `<b>Current Price:</b> $${formatNumber(tokenInfo.price.usd)}\n`;
    
    if (tokenInfo.price.change24h !== undefined) {
      const changeText = formatPercentage(tokenInfo.price.change24h);
      const changeEmoji = tokenInfo.price.change24h >= 0 ? '🟢' : '🔴';
      html += `<b>24h Change:</b> ${changeEmoji} ${changeText}\n`;
    }
    
    if (tokenInfo.volume?.usd24h) {
      html += `<b>24h Volume:</b> $${formatNumber(tokenInfo.volume.usd24h)}\n`;
      
      if (tokenInfo.volume.change24h !== undefined) {
        const volumeChangeText = formatPercentage(tokenInfo.volume.change24h);
        html += `<b>Volume Change:</b> ${volumeChangeText}\n`;
      }
    }
    
    html += '\n';
  }
  
  // Add detailed information if requested
  if (detailed) {
    html += `<b>🔍 Additional Information</b>\n`;
    html += `<b>Full Mint Address:</b> <code>${tokenInfo.mint}</code>\n`;
    // Add more detailed information as needed
  }
  
  return html;
};

/**
 * Formats program health information into HTML
 * @param programHealth Program health information
 * @returns HTML-formatted program health information
 */
export const formatProgramHealthHTML = (
  programHealth: FormattedProgramHealth
): string => {
  let html = `<b>📊 Program Health</b>\n\n`;
  
  // Program ID
  html += `<b>Program ID:</b> <code>${formatAddress(programHealth.programId)}</code>\n\n`;
  
  // TVL information
  html += `<b>💰 Total Value Locked (TVL)</b>\n`;
  html += `<b>Current TVL:</b> $${formatNumber(programHealth.tvl)}\n`;
  
  if (programHealth.tvlChange24h !== undefined) {
    const changeText = formatPercentage(programHealth.tvlChange24h);
    const changeEmoji = programHealth.tvlChange24h >= 0 ? '🟢' : '🔴';
    html += `<b>24h Change:</b> ${changeEmoji} ${changeText}\n\n`;
  } else {
    html += '\n';
  }
  
  // User activity
  html += `<b>👥 User Activity (24h)</b>\n`;
  html += `<b>Active Users:</b> ${formatNumber(programHealth.activeUsers24h, 0)}\n`;
  
  if (programHealth.activeUsersChange24h !== undefined) {
    const changeText = formatPercentage(programHealth.activeUsersChange24h);
    const changeEmoji = programHealth.activeUsersChange24h >= 0 ? '🟢' : '🔴';
    html += `<b>Change:</b> ${changeEmoji} ${changeText}\n\n`;
  } else {
    html += '\n';
  }
  
  // Transaction activity
  html += `<b>🔄 Transaction Activity (24h)</b>\n`;
  html += `<b>Transactions:</b> ${formatNumber(programHealth.transactions24h, 0)}\n`;
  
  if (programHealth.transactionsChange24h !== undefined) {
    const changeText = formatPercentage(programHealth.transactionsChange24h);
    const changeEmoji = programHealth.transactionsChange24h >= 0 ? '🟢' : '🔴';
    html += `<b>Change:</b> ${changeEmoji} ${changeText}\n`;
  }
  
  return html;
};

/**
 * Formats alert trigger notification into HTML
 * @param alert Alert object
 * @param currentValue Current value that triggered the alert
 * @returns HTML-formatted alert notification
 */
export const formatAlertTriggerHTML = (
  alert: any,
  currentValue: number
): string => {
  let html = `<b>🚨 Alert Triggered</b>\n\n`;
  
  // Alert label if available
  if (alert.label) {
    html += `<b>Alert:</b> ${escapeHtml(alert.label)}\n\n`;
  }
  
  // Format based on alert type
  switch (alert.alertType) {
    case 'price':
      html += formatPriceAlertHTML(alert, currentValue);
      break;
    case 'balance':
      html += formatBalanceAlertHTML(alert, currentValue);
      break;
    case 'tvl':
      html += formatTVLAlertHTML(alert, currentValue);
      break;
    case 'activeUsers':
      html += formatActiveUsersAlertHTML(alert, currentValue);
      break;
    default:
      html += `<b>Condition:</b> ${alert.operator === 'gt' ? 'greater than' : 'less than'} ${alert.condition.threshold}\n`;
      html += `<b>Current Value:</b> ${formatNumber(currentValue)}\n`;
  }
  
  // Add timestamp
  html += `\n<i>Triggered at: ${new Date().toISOString()}</i>`;
  
  return html;
};

/**
 * Formats price alert into HTML
 * @param alert Price alert object
 * @param currentPrice Current price that triggered the alert
 * @returns HTML-formatted price alert
 */
const formatPriceAlertHTML = (alert: any, currentPrice: number): string => {
  const condition = alert.condition;
  let html = `<b>💰 Price Alert</b>\n`;
  
  // Token information
  html += `<b>Asset:</b> ${condition.assetMint}\n`;
  
  if (condition.quoteMint) {
    html += `<b>Quote:</b> ${condition.quoteMint}\n`;
  }
  
  if (condition.marketId) {
    html += `<b>Market:</b> ${condition.marketId}\n`;
  }
  
  // Condition and current value
  html += `<b>Condition:</b> Price ${condition.operator === 'gt' ? 'above' : 'below'} $${formatNumber(condition.threshold)}\n`;
  html += `<b>Current Price:</b> $${formatNumber(currentPrice)}\n`;
  
  return html;
};

/**
 * Formats balance alert into HTML
 * @param alert Balance alert object
 * @param currentBalance Current balance that triggered the alert
 * @returns HTML-formatted balance alert
 */
const formatBalanceAlertHTML = (alert: any, currentBalance: number): string => {
  const condition = alert.condition;
  let html = `<b>💼 Balance Alert</b>\n`;
  
  // Wallet and token information
  html += `<b>Wallet:</b> ${formatAddress(condition.walletAddress)}\n`;
  html += `<b>Asset:</b> ${condition.assetMint}\n`;
  
  // Condition and current value
  html += `<b>Condition:</b> Balance ${condition.operator === 'gt' ? 'above' : 'below'} ${formatNumber(condition.threshold)}\n`;
  html += `<b>Current Balance:</b> ${formatNumber(currentBalance)}\n`;
  
  return html;
};

/**
 * Formats TVL alert into HTML
 * @param alert TVL alert object
 * @param currentTVL Current TVL that triggered the alert
 * @returns HTML-formatted TVL alert
 */
const formatTVLAlertHTML = (alert: any, currentTVL: number): string => {
  const condition = alert.condition;
  let html = `<b>📈 TVL Alert</b>\n`;
  
  // Program information
  html += `<b>Program:</b> ${formatAddress(condition.programId)}\n`;
  
  // Condition and current value
  html += `<b>Condition:</b> TVL ${condition.operator === 'gt' ? 'above' : 'below'} $${formatNumber(condition.threshold)}\n`;
  html += `<b>Current TVL:</b> $${formatNumber(currentTVL)}\n`;
  
  return html;
};

/**
 * Formats active users alert into HTML
 * @param alert Active users alert object
 * @param currentUsers Current active users that triggered the alert
 * @returns HTML-formatted active users alert
 */
const formatActiveUsersAlertHTML = (alert: any, currentUsers: number): string => {
  const condition = alert.condition;
  let html = `<b>👥 Active Users Alert</b>\n`;
  
  // Program information
  html += `<b>Program:</b> ${formatAddress(condition.programId)}\n`;
  
  // Timeframe if available
  if (condition.timeframe) {
    html += `<b>Timeframe:</b> ${condition.timeframe}\n`;
  }
  
  // Condition and current value
  html += `<b>Condition:</b> Active users ${condition.operator === 'gt' ? 'above' : 'below'} ${formatNumber(condition.threshold, 0)}\n`;
  html += `<b>Current Active Users:</b> ${formatNumber(currentUsers, 0)}\n`;
  
  return html;
};
