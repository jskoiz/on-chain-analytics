import { FormattedWalletSummary, FormattedTokenInfo, FormattedProgramHealth } from '../modules/vybeApi';

/**
 * Escapes HTML special characters to prevent injection.
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
 * Formats a number with commas as thousands separators.
 */
export const formatNumber = (num: number, decimals = 2): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Formats a percentage change with sign.
 */
export const formatPercentage = (change: number | undefined, decimals = 2): string => {
  if (change === undefined || change === null) {
    return 'N/A';
  }
  const sign = change >= 0 ? '+' : '';
  return `${sign}${formatNumber(change, decimals)}%`;
};

/**
 * Formats a Solana address by truncating the middle.
 */
export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) {
    return address;
  }
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
};

/**
 * Formats a wallet summary into HTML.
 * The entire content is wrapped in a full‑width <div>.
 */
export const formatWalletSummaryHTML = (
  summary: FormattedWalletSummary,
  detailed = false
): string => {
  let html = `<div style="width:100%;">
  <b>📊 Wallet Summary</b><br><br>
  <table width="100%" style="border-collapse:collapse;">
    <tr>
      <td width="50%"><b>Address:</b> <span style="font-family:monospace;">${formatAddress(summary.owner)}</span></td>
      <td width="50%"><b>SOL Balance:</b> ${formatNumber(summary.solBalance)}</td>
    </tr>`;
  if (summary.totalUsdValue !== undefined) {
    html += `<tr>
      <td colspan="2"><b>Total USD Value:</b> $${formatNumber(summary.totalUsdValue)}</td>
    </tr>`;
  }
  html += `</table><br>`;

  if (summary.tokens.length > 0) {
    html += `<b>🪙 Tokens (${summary.tokens.length})</b><br>
    <table width="100%" style="border-collapse:collapse;">`;
    const sortedTokens = [...summary.tokens].sort((a, b) =>
      (b.usdValue || 0) - (a.usdValue || 0)
    );
    const tokensToShow = detailed ? sortedTokens : sortedTokens.slice(0, 10);
    for (let i = 0; i < tokensToShow.length; i += 2) {
      html += `<tr>`;
      html += `<td width="50%">• <b>${escapeHtml(tokensToShow[i].symbol)}</b>: ${formatNumber(tokensToShow[i].balance)}`;
      if (tokensToShow[i].usdValue !== undefined) {
        html += ` ($${formatNumber(tokensToShow[i].usdValue as number)})`;
      }
      html += `</td>`;
      if (i + 1 < tokensToShow.length) {
        html += `<td width="50%">• <b>${escapeHtml(tokensToShow[i+1].symbol)}</b>: ${formatNumber(tokensToShow[i+1].balance)}`;
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
      html += `<br><i>...and ${summary.tokens.length - 10} more tokens</i>`;
    }
    html += `<br>`;
  }

  if (summary.nfts.length > 0) {
    html += `<b>🖼 NFTs (${summary.nfts.length})</b><br>
    <table width="100%" style="border-collapse:collapse;">`;
    const nftsToShow = detailed ? summary.nfts : summary.nfts.slice(0, 5);
    for (let i = 0; i < nftsToShow.length; i += 2) {
      html += `<tr>`;
      html += `<td width="50%">• <b>${escapeHtml(nftsToShow[i].name)}</b>`;
      if (nftsToShow[i].collection !== undefined) {
        html += ` (${escapeHtml(nftsToShow[i].collection as string)})`;
      }
      html += `</td>`;
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
      html += `<br><i>...and ${summary.nfts.length - 5} more NFTs</i>`;
    }
  }
  html += `</div>`;
  return html;
};

/**
 * Formats token information into HTML.
 * Output is wrapped in a full‑width div.
 */
export const formatTokenInfoHTML = (
  tokenInfo: FormattedTokenInfo,
  detailed = false
): string => {
  let html = `<div style="width:100%;">
  <b>🪙 Token Information</b><br><br>
  <table width="100%" style="border-collapse:collapse;">
    <tr>
      <td width="50%"><b>Name:</b> ${escapeHtml(tokenInfo.name)}</td>
      <td width="50%"><b>Symbol:</b> ${escapeHtml(tokenInfo.symbol)}</td>
    </tr>
    <tr>
      <td width="50%"><b>Mint:</b> <span style="font-family:monospace;">${formatAddress(tokenInfo.mint)}</span></td>
      <td width="50%"><b>Decimals:</b> ${tokenInfo.decimals}</td>
    </tr>
    <tr>
      <td width="50%"><b>Supply:</b> ${formatNumber(tokenInfo.supply)}</td>
      <td width="50%"><b>Holders:</b> ${formatNumber(tokenInfo.holders, 0)}</td>
    </tr>
  </table><br>`;
  if (tokenInfo.price) {
    html += `<b>💰 Price Information</b><br>
    <table width="100%" style="border-collapse:collapse;">
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
    html += `</table><br>`;
  }
  if (detailed) {
    html += `<b>🔍 Additional Information</b><br>
    <table width="100%" style="border-collapse:collapse;">
      <tr>
        <td width="100%"><b>Full Mint Address:</b> <span style="font-family:monospace;">${tokenInfo.mint}</span></td>
      </tr>
    </table><br>`;
  }
  html += `</div>`;
  return html;
};

/**
 * Formats program health information into HTML.
 * The output is wrapped in a full‑width div.
 */
export const formatProgramHealthHTML = (
  programHealth: FormattedProgramHealth
): string => {
  let html = `<div style="width:100%;">
  <b>📊 Program Health</b><br><br>
  <table width="100%" style="border-collapse:collapse;">
    <tr>
      <td width="100%"><b>Program ID:</b> <span style="font-family:monospace;">${formatAddress(programHealth.programId)}</span></td>
    </tr>
  </table><br>
  <div><b>💰 Total Value Locked (TVL)</b></div>
  <table width="100%" style="border-collapse:collapse;">
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
  </table><br>
  <table width="100%" style="border-collapse:collapse;">
    <tr>
      <td colspan="2"><div><b>👥 User Activity (24h)</b></div></td>
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
      <td colspan="2"><div><b>🔄 Transaction Activity (24h)</b></div></td>
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
  </table>
  </div>`;
  return html;
};

/**
 * Formats alert trigger notification into HTML.
 * The notification is wrapped in a full‑width div.
 */
export const formatAlertTriggerHTML = (
  alert: any,
  currentValue: number
): string => {
  let html = `<div style="width:100%;">
  <b>🚨 Alert Triggered</b><br><br>`;
  if (alert.label) {
    html += `<table width="100%" style="border-collapse:collapse;">
      <tr>
        <td width="100%"><b>Alert:</b> ${escapeHtml(alert.label)}</td>
      </tr>
    </table><br>`;
  }
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
      html += `<table width="100%" style="border-collapse:collapse;">
        <tr>
          <td width="50%"><b>Condition:</b> ${alert.operator === 'gt' ? 'greater than' : 'less than'} ${alert.condition.threshold}</td>
          <td width="50%"><b>Current Value:</b> ${formatNumber(currentValue)}</td>
        </tr>
      </table><br>`;
  }
  html += `<div><i>Triggered at: ${new Date().toISOString()}</i></div>
  </div>`;
  return html;
};

const formatPriceAlertHTML = (alert: any, currentPrice: number): string => {
  const condition = alert.condition;
  let html = `<div style="width:100%;">
  <b>💰 Price Alert</b><br>
  <table width="100%" style="border-collapse:collapse;">
    <tr>
      <td width="100%"><b>Asset:</b> ${condition.assetMint}</td>
    </tr>`;
  if (condition.quoteMint) {
    html += `<tr>
      <td width="100%"><b>Quote:</b> ${condition.quoteMint}</td>
    </tr>`;
  }
  if (condition.marketId) {
    html += `<tr>
      <td width="100%"><b>Market:</b> ${condition.marketId}</td>
    </tr>`;
  }
  html += `<tr>
      <td width="50%"><b>Condition:</b> Price ${condition.operator === 'gt' ? 'above' : 'below'} $${formatNumber(condition.threshold)}</td>
      <td width="50%"><b>Current Price:</b> $${formatNumber(currentPrice)}</td>
    </tr>
  </table>
  </div>`;
  return html;
};

const formatBalanceAlertHTML = (alert: any, currentBalance: number): string => {
  const condition = alert.condition;
  let html = `<div style="width:100%;">
  <b>💼 Balance Alert</b><br>
  <table width="100%" style="border-collapse:collapse;">
    <tr>
      <td width="50%"><b>Wallet:</b> ${formatAddress(condition.walletAddress)}</td>
      <td width="50%"><b>Asset:</b> ${condition.assetMint}</td>
    </tr>
    <tr>
      <td width="50%"><b>Condition:</b> Balance ${condition.operator === 'gt' ? 'above' : 'below'} ${formatNumber(condition.threshold)}</td>
      <td width="50%"><b>Current Balance:</b> ${formatNumber(currentBalance)}</td>
    </tr>
  </table>
  </div>`;
  return html;
};

const formatTVLAlertHTML = (alert: any, currentTVL: number): string => {
  const condition = alert.condition;
  let html = `<div style="width:100%;">
  <b>📈 TVL Alert</b><br>
  <table width="100%" style="border-collapse:collapse;">
    <tr>
      <td width="100%"><b>Program:</b> ${formatAddress(condition.programId)}</td>
    </tr>
    <tr>
      <td width="50%"><b>Condition:</b> TVL ${condition.operator === 'gt' ? 'above' : 'below'} $${formatNumber(condition.threshold)}</td>
      <td width="50%"><b>Current TVL:</b> $${formatNumber(currentTVL)}</td>
    </tr>
  </table>
  </div>`;
  return html;
};

const formatActiveUsersAlertHTML = (alert: any, currentUsers: number): string => {
  const condition = alert.condition;
  let html = `<div style="width:100%;">
  <b>👥 Active Users Alert</b><br>
  <table width="100%" style="border-collapse:collapse;">
    <tr>
      <td width="100%"><b>Program:</b> ${formatAddress(condition.programId)}</td>
    </tr>`;
  if (condition.timeframe) {
    html += `<tr>
      <td width="100%"><b>Timeframe:</b> ${condition.timeframe}</td>
    </tr>`;
  }
  html += `<tr>
      <td width="50%"><b>Condition:</b> Active users ${condition.operator === 'gt' ? 'above' : 'below'} ${formatNumber(condition.threshold, 0)}</td>
      <td width="50%"><b>Current Active Users:</b> ${formatNumber(currentUsers, 0)}</td>
    </tr>
  </table>
  </div>`;
  return html;
};
