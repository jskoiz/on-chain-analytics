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
  // Use table-based layout for wider messages
  let html = `<div style="width:100%"><b>📊 Wallet Summary</b></div>\n\n`;
  
  // Header table with wallet info
  html += `<table width="100%" style="border-collapse:collapse">
    <tr>
      <td width="50%"><b>Address:</b> <code>${formatAddress(summary.owner)}</code></td>
      <td width="50%"><b>SOL Balance:</b> <code>${formatNumber(summary.solBalance)}</code></td>
    </tr>`;
  
  if (summary.totalUsdValue !== undefined) {
    html += `<tr>
      <td colspan="2"><b>Total USD Value:</b> <code>$${formatNumber(summary.totalUsdValue)}</code></td>
    </tr>`;
  }
  
  html += `</table>\n\n`;
  
  // Token balances with table layout
  if (summary.tokens.length > 0) {
    html += `<div style="width:100%"><b>🪙 Tokens (${summary.tokens.length})</b></div>\n`;
    html += `<table width="100%" style="border-collapse:collapse">`;
    
    // Sort tokens by USD value (if available)
    const sortedTokens = [...summary.tokens].sort((a, b) =>
      (b.usdValue || 0) - (a.usdValue || 0)
    );
    
    // Limit to top 10 tokens for basic view
    const tokensToShow = detailed ? sortedTokens : sortedTokens.slice(0, 10);
    
    // Create rows with two tokens per row for better horizontal space usage
    for (let i = 0; i < tokensToShow.length; i += 2) {
      html += `<tr>`;
      
      // First token in row
      html += `<td width="50%">• <b>${escapeHtml(tokensToShow[i].symbol)}</b>: <code>${formatNumber(tokensToShow[i].balance)}</code>`;
      if (tokensToShow[i].usdValue !== undefined) {
        html += ` ($${formatNumber(tokensToShow[i].usdValue as number)})`;
      }
      html += `</td>`;
      
      // Second token in row (if exists)
      if (i + 1 < tokensToShow.length) {
        html += `<td width="50%">• <b>${escapeHtml(tokensToShow[i+1].symbol)}</b>: <code>${formatNumber(tokensToShow[i+1].balance)}</code>`;
        if (tokensToShow[i+1].usdValue !== undefined) {
          html += ` ($${formatNumber(tokensToShow[i+1].usdValue as number)})`;
        }
        html += `</td>`;
      } else {
        html += `<td width="50%"></td>`;
      }
      
      html += `</tr>`;
    }
    
    html += `</table>`;
    
    if (!detailed && summary.tokens.length > 10) {
      html += `<div style="width:100%"><i>...and ${summary.tokens.length - 10} more tokens</i></div>\n`;
    }
    
    html += '\n';
  }
  
  // NFT balances with table layout
  if (summary.nfts.length > 0) {
    html += `<div style="width:100%"><b>🖼 NFTs (${summary.nfts.length})</b></div>\n`;
    html += `<table width="100%" style="border-collapse:collapse">`;
    
    // Limit to top 5 NFTs for basic view
    const nftsToShow = detailed ? summary.nfts : summary.nfts.slice(0, 5);
    
    // Create rows with two NFTs per row
    for (let i = 0; i < nftsToShow.length; i += 2) {
      html += `<tr>`;
      
      // First NFT in row
      html += `<td width="50%">• <b>${escapeHtml(nftsToShow[i].name)}</b>`;
      if (nftsToShow[i].collection !== undefined) {
        html += ` (${escapeHtml(nftsToShow[i].collection as string)})`;
      }
      html += `</td>`;
      
      // Second NFT in row (if exists)
      if (i + 1 < nftsToShow.length) {
        html += `<td width="50%">• <b>${escapeHtml(nftsToShow[i+1].name)}</b>`;
        if (nftsToShow[i+1].collection !== undefined) {
          html += ` (${escapeHtml(nftsToShow[i+1].collection as string)})`;
        }
        html += `</td>`;
      } else {
        html += `<td width="50%"></td>`;
      }
      
      html += `</tr>`;
    }
    
    html += `</table>`;
    
    if (!detailed && summary.nfts.length > 5) {
      html += `<div style="width:100%"><i>...and ${summary.nfts.length - 5} more NFTs</i></div>\n`;
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
  let html = `<div style="width:100%"><b>🪙 Token Information</b></div>\n\n`;
  
  // Basic token info in a table layout
  html += `<table width="100%" style="border-collapse:collapse">
    <tr>
      <td width="50%"><b>Name:</b> ${escapeHtml(tokenInfo.name)}</td>
      <td width="50%"><b>Symbol:</b> ${escapeHtml(tokenInfo.symbol)}</td>
    </tr>
    <tr>
      <td width="50%"><b>Mint:</b> <code>${formatAddress(tokenInfo.mint)}</code></td>
      <td width="50%"><b>Decimals:</b> ${tokenInfo.decimals}</td>
    </tr>
    <tr>
      <td width="50%"><b>Supply:</b> ${formatNumber(tokenInfo.supply)}</td>
      <td width="50%"><b>Holders:</b> ${formatNumber(tokenInfo.holders, 0)}</td>
    </tr>
  </table>\n\n`;
  
  // Price information in a table layout
  if (tokenInfo.price) {
    html += `<div style="width:100%"><b>💰 Price Information</b></div>\n`;
    html += `<table width="100%" style="border-collapse:collapse">
      <tr>
        <td width="50%"><b>Current Price:</b> $${formatNumber(tokenInfo.price.usd)}</td>`;
    
    if (tokenInfo.price.change24h !== undefined) {
      const changeText = formatPercentage(tokenInfo.price.change24h);
      const changeEmoji = tokenInfo.price.change24h >= 0 ? '🟢' : '🔴';
      html += `<td width="50%"><b>24h Change:</b> ${changeEmoji} ${changeText}</td>`;
    } else {
      html += `<td width="50%"></td>`;
    }
    
    html += `</tr>`;
    
    if (tokenInfo.volume?.usd24h) {
      html += `<tr>
        <td width="50%"><b>24h Volume:</b> $${formatNumber(tokenInfo.volume.usd24h)}</td>`;
      
      if (tokenInfo.volume.change24h !== undefined) {
        const volumeChangeText = formatPercentage(tokenInfo.volume.change24h);
        html += `<td width="50%"><b>Volume Change:</b> ${volumeChangeText}</td>`;
      } else {
        html += `<td width="50%"></td>`;
      }
      
      html += `</tr>`;
    }
    
    html += `</table>\n\n`;
  }
  
  // Add detailed information if requested
  if (detailed) {
    html += `<div style="width:100%"><b>🔍 Additional Information</b></div>\n`;
    html += `<table width="100%" style="border-collapse:collapse">
      <tr>
        <td width="100%"><b>Full Mint Address:</b> <code>${tokenInfo.mint}</code></td>
      </tr>
      <!-- Add more detailed information as needed -->
    </table>\n`;
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
  let html = `<div style="width:100%"><b>📊 Program Health</b></div>\n\n`;
  
  // Program ID in a full-width table
  html += `<table width="100%" style="border-collapse:collapse">
    <tr>
      <td width="100%"><b>Program ID:</b> <code>${formatAddress(programHealth.programId)}</code></td>
    </tr>
  </table>\n\n`;
  
  // TVL information in a table layout
  html += `<div style="width:100%"><b>💰 Total Value Locked (TVL)</b></div>\n`;
  html += `<table width="100%" style="border-collapse:collapse">
    <tr>
      <td width="50%"><b>Current TVL:</b> $${formatNumber(programHealth.tvl)}</td>`;
  
  if (programHealth.tvlChange24h !== undefined) {
    const changeText = formatPercentage(programHealth.tvlChange24h);
    const changeEmoji = programHealth.tvlChange24h >= 0 ? '🟢' : '🔴';
    html += `<td width="50%"><b>24h Change:</b> ${changeEmoji} ${changeText}</td>`;
  } else {
    html += `<td width="50%"></td>`;
  }
  
  html += `</tr>
  </table>\n\n`;
  
  // User and transaction activity in a table layout
  html += `<table width="100%" style="border-collapse:collapse">
    <tr>
      <td colspan="2"><div style="width:100%"><b>👥 User Activity (24h)</b></div></td>
    </tr>
    <tr>
      <td width="50%"><b>Active Users:</b> ${formatNumber(programHealth.activeUsers24h, 0)}</td>`;
  
  if (programHealth.activeUsersChange24h !== undefined) {
    const changeText = formatPercentage(programHealth.activeUsersChange24h);
    const changeEmoji = programHealth.activeUsersChange24h >= 0 ? '🟢' : '🔴';
    html += `<td width="50%"><b>Change:</b> ${changeEmoji} ${changeText}</td>`;
  } else {
    html += `<td width="50%"></td>`;
  }
  
  html += `</tr>
    <tr>
      <td colspan="2"><div style="width:100%"><b>🔄 Transaction Activity (24h)</b></div></td>
    </tr>
    <tr>
      <td width="50%"><b>Transactions:</b> ${formatNumber(programHealth.transactions24h, 0)}</td>`;
  
  if (programHealth.transactionsChange24h !== undefined) {
    const changeText = formatPercentage(programHealth.transactionsChange24h);
    const changeEmoji = programHealth.transactionsChange24h >= 0 ? '🟢' : '🔴';
    html += `<td width="50%"><b>Change:</b> ${changeEmoji} ${changeText}</td>`;
  } else {
    html += `<td width="50%"></td>`;
  }
  
  html += `</tr>
  </table>\n`;
  
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
  let html = `<div style="width:100%"><b>🚨 Alert Triggered</b></div>\n\n`;
  
  // Alert label if available
  if (alert.label) {
    html += `<table width="100%" style="border-collapse:collapse">
      <tr>
        <td width="100%"><b>Alert:</b> ${escapeHtml(alert.label)}</td>
      </tr>
    </table>\n\n`;
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
      html += `<table width="100%" style="border-collapse:collapse">
        <tr>
          <td width="50%"><b>Condition:</b> ${alert.operator === 'gt' ? 'greater than' : 'less than'} ${alert.condition.threshold}</td>
          <td width="50%"><b>Current Value:</b> ${formatNumber(currentValue)}</td>
        </tr>
      </table>\n`;
  }
  
  // Add timestamp
  html += `\n<div style="width:100%"><i>Triggered at: ${new Date().toISOString()}</i></div>`;
  
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
  let html = `<div style="width:100%"><b>💰 Price Alert</b></div>\n`;
  
  // Token information in a table layout
  html += `<table width="100%" style="border-collapse:collapse">`;
  
  // Asset row
  html += `<tr>
    <td width="100%"><b>Asset:</b> ${condition.assetMint}</td>
  </tr>`;
  
  // Quote row (if available)
  if (condition.quoteMint) {
    html += `<tr>
      <td width="100%"><b>Quote:</b> ${condition.quoteMint}</td>
    </tr>`;
  }
  
  // Market row (if available)
  if (condition.marketId) {
    html += `<tr>
      <td width="100%"><b>Market:</b> ${condition.marketId}</td>
    </tr>`;
  }
  
  // Condition and current value in a two-column layout
  html += `<tr>
    <td width="50%"><b>Condition:</b> Price ${condition.operator === 'gt' ? 'above' : 'below'} $${formatNumber(condition.threshold)}</td>
    <td width="50%"><b>Current Price:</b> $${formatNumber(currentPrice)}</td>
  </tr>
  </table>\n`;
  
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
  let html = `<div style="width:100%"><b>💼 Balance Alert</b></div>\n`;
  
  // Wallet and token information in a table layout
  html += `<table width="100%" style="border-collapse:collapse">
    <tr>
      <td width="50%"><b>Wallet:</b> ${formatAddress(condition.walletAddress)}</td>
      <td width="50%"><b>Asset:</b> ${condition.assetMint}</td>
    </tr>
    <tr>
      <td width="50%"><b>Condition:</b> Balance ${condition.operator === 'gt' ? 'above' : 'below'} ${formatNumber(condition.threshold)}</td>
      <td width="50%"><b>Current Balance:</b> ${formatNumber(currentBalance)}</td>
    </tr>
  </table>\n`;
  
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
  let html = `<div style="width:100%"><b>📈 TVL Alert</b></div>\n`;
  
  // Program information in a table layout
  html += `<table width="100%" style="border-collapse:collapse">
    <tr>
      <td width="100%"><b>Program:</b> ${formatAddress(condition.programId)}</td>
    </tr>
    <tr>
      <td width="50%"><b>Condition:</b> TVL ${condition.operator === 'gt' ? 'above' : 'below'} $${formatNumber(condition.threshold)}</td>
      <td width="50%"><b>Current TVL:</b> $${formatNumber(currentTVL)}</td>
    </tr>
  </table>\n`;
  
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
  let html = `<div style="width:100%"><b>👥 Active Users Alert</b></div>\n`;
  
  // Program information in a table layout
  html += `<table width="100%" style="border-collapse:collapse">
    <tr>
      <td width="100%"><b>Program:</b> ${formatAddress(condition.programId)}</td>
    </tr>`;
  
  // Timeframe row if available
  if (condition.timeframe) {
    html += `<tr>
      <td width="100%"><b>Timeframe:</b> ${condition.timeframe}</td>
    </tr>`;
  }
  
  // Condition and current value in a two-column layout
  html += `<tr>
    <td width="50%"><b>Condition:</b> Active users ${condition.operator === 'gt' ? 'above' : 'below'} ${formatNumber(condition.threshold, 0)}</td>
    <td width="50%"><b>Current Active Users:</b> ${formatNumber(currentUsers, 0)}</td>
  </tr>
  </table>\n`;
  
  return html;
};
