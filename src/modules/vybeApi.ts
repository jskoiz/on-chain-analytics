// Import the Vybe API SDK
import * as vybeApiSdk from '@api/vybe-api';
// Assign to vybeApi variable for backward compatibility
const vybeApi = vybeApiSdk.default;

// Log the structure of the imported SDK for debugging
console.log('vybeApiSdk structure:', {
  hasDefault: vybeApiSdk.default !== undefined,
  keys: Object.keys(vybeApiSdk),
  defaultKeys: vybeApiSdk.default ? Object.keys(vybeApiSdk.default) : []
});
import Bottleneck from 'bottleneck';
import config from '../config';
import logger from '../utils/logger';

/**
 * Interface for formatted wallet summary
 */
export interface FormattedWalletSummary {
  owner: string;
  solBalance: number;
  tokens: {
    mint: string;
    symbol: string;
    balance: number;
    usdValue?: number;
  }[];
  nfts: {
    mint: string;
    name: string;
    collection?: string;
    image?: string;
  }[];
  totalUsdValue?: number;
}

/**
 * Interface for formatted token information
 */
export interface FormattedTokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  holders: number;
  price?: {
    usd: number;
    change24h?: number;
  };
  volume?: {
    usd24h: number;
    change24h?: number;
  };
}

/**
 * Interface for formatted program health information
 */
export interface FormattedProgramHealth {
  programId: string;
  tvl: number;
  tvlChange24h?: number;
  activeUsers24h: number;
  activeUsersChange24h?: number;
  transactions24h: number;
  transactionsChange24h?: number;
}

/**
 * Rate limiter for Vybe API requests
 * - 10 requests per second
 * - 100 requests per minute
 */
const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 100, // 100ms between requests (max 10 per second)
  reservoir: 100, // 100 requests
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60 * 1000, // 1 minute
});

/**
 * Initialize the Vybe API with the API key
 */
export const initVybeApi = (): void => {
  try {
    // Log the API structure before initialization
    logger.debug('Vybe API structure before initialization', {
      keys: Object.keys(vybeApi),
      hasAuth: typeof vybeApi.auth === 'function',
      sdkType: typeof vybeApi,
      isDefault: vybeApiSdk.default !== undefined,
    });
    
    // Initialize the real API
    vybeApi.auth(config.vybeApiKey);
    
    // Log the API structure after initialization
    logger.debug('Vybe API structure after initialization', {
      keys: Object.keys(vybeApi),
      methodTypes: {
        get_known_accounts: typeof vybeApi.get_known_accounts,
        get_wallet_tokens: typeof vybeApi.get_wallet_tokens,
        get_wallet_nfts: typeof vybeApi.get_wallet_nfts,
        get_markets: typeof vybeApi.get_markets
      }
    });
    
    // Test if the API is working by checking for essential methods
    if (typeof vybeApi.get_known_accounts !== 'function' ||
        typeof vybeApi.get_wallet_tokens !== 'function' ||
        typeof vybeApi.get_wallet_nfts !== 'function') {
      throw new Error('Vybe API is not properly initialized. Missing expected methods.');
    }
    
    logger.info('Vybe API initialized successfully');
  } catch (error: any) {
    logger.error('Failed to initialize Vybe API', { 
      error, 
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name
    });
    throw error;
  }
};

/**
 * Wrapper for Vybe API requests with error handling and rate limiting
 * @param apiCall Function that makes the actual API call
 * @param params Parameters for the API call
 * @param retries Number of retries for 5xx errors
 * @returns The API response
 */
const callVybeApi = async <T, P>(
  apiMethod: string,
  params: P,
  retries = 3
): Promise<T> => {
  return limiter.schedule(async () => {
    try {
      logger.debug(`Calling Vybe API method: ${apiMethod}`, { params });
      
      // Check if the method exists
      if (typeof (vybeApi as any)[apiMethod] !== 'function') {
        logger.error(`Vybe API method not found: ${apiMethod}`, {
          availableMethods: Object.keys(vybeApi as any).filter(key => typeof (vybeApi as any)[key] === 'function')
        });
        throw new Error(`Vybe API method not found: ${apiMethod}`);
      }
      
      // @ts-ignore - Call the method on the vybeApi object directly
      const result = await (vybeApi as any)[apiMethod](params);
      logger.debug(`Vybe API call successful: ${apiMethod}`, {
        resultType: typeof result,
        hasData: result && typeof result === 'object' && 'data' in result
      });
      return result;
    } catch (error: any) {
      // Handle API errors
      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data || {};
        
        // Client errors (4xx) - log and throw
        if (status >= 400 && status < 500) {
          logger.error(`Vybe API client error: ${status} ${error.response.statusText || ''}`, { 
            status, 
            method: apiMethod,
            params,
            responseData,
            message: error.message,
            errorDetails: responseData.error || responseData.message || 'No detailed error message',
            url: error.config?.url || 'Unknown URL'
          });
          throw error;
        }
        
        // Server errors (5xx) - retry with exponential backoff
        if (status >= 500 && retries > 0) {
          const delay = 1000 * Math.pow(2, 3 - retries); // Exponential backoff
          logger.warn(`Vybe API server error: ${status} ${error.response.statusText || ''}, retrying in ${delay}ms`, {
            status,
            method: apiMethod,
            params,
            responseData,
            message: error.message,
            retries,
            url: error.config?.url || 'Unknown URL'
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return callVybeApi(apiMethod, params, retries - 1);
        }
      }
      
      // Network or other errors
      logger.error(`Vybe API request failed for method: ${apiMethod}`, { 
        method: apiMethod,
        params,
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code || 'UNKNOWN_ERROR',
        isAxiosError: error.isAxiosError || false,
        config: error.config ? {
          url: error.config.url,
          method: error.config.method,
          baseURL: error.config.baseURL
        } : 'No config available'
      });
      throw error;
    }
  });
};

// ===== Account Endpoints =====

/**
 * Get known accounts from Vybe API
 * @returns List of known accounts
 */
export const getKnownAccounts = async (): Promise<any> => {
  return callVybeApi('get_known_accounts', {});
};

/**
 * Get NFT balance for a wallet
 * @param ownerAddress Wallet address
 * @returns NFT balance information
 */
export const getNftBalance = async (ownerAddress: string): Promise<any> => {
  try {
    logger.info('Using vybeApi.get_wallet_nfts');
    return await callVybeApi('get_wallet_nfts', { ownerAddress });
  } catch (error: any) {
    logger.error('Error in getNftBalance', { error, ownerAddress });
    throw error;
  }
};

/**
 * Get NFT balances for multiple wallets
 * @param ownerAddresses Array of wallet addresses
 * @returns NFT balance information for multiple wallets
 */
export const getNftBalances = async (ownerAddresses: string[]): Promise<any> => {
  return callVybeApi('post_wallet_nfts_many', { wallets: ownerAddresses });
};

/**
 * Get token balance for a wallet
 * @param ownerAddress Wallet address
 * @returns Token balance information
 */
export const getTokenBalance = async (ownerAddress: string): Promise<any> => {
  try {
    logger.info('Using vybeApi.get_wallet_tokens');
    const response = await callVybeApi('get_wallet_tokens', {
      ownerAddress,
      minAssetValue: "0",
      maxAssetValue: "999999999999"
    });
    
    // Log the response structure for debugging
    logger.debug('Token balance response structure:', {
      hasData: response && typeof response === 'object' && 'data' in response,
      responseKeys: response && typeof response === 'object' ? Object.keys(response) : [],
      dataType: response && typeof response === 'object' && 'data' in response ? typeof response.data : 'undefined',
      dataIsArray: response && typeof response === 'object' && 'data' in response ? Array.isArray(response.data) : false,
      totalTokenValueUsd: response && typeof response === 'object' && 'totalTokenValueUsd' in response ? response.totalTokenValueUsd : 'not found'
    });
    
    return response;
  } catch (error: any) {
    logger.error('Error in getTokenBalance', { error, ownerAddress });
    throw error;
  }
};

/**
 * Get token balances for multiple wallets
 * @param ownerAddresses Array of wallet addresses
 * @returns Token balance information for multiple wallets
 */
export const getTokenBalances = async (ownerAddresses: string[]): Promise<any> => {
  return callVybeApi('post_wallet_tokens_many', {
    wallets: ownerAddresses,
    minAssetValue: "0",
    maxAssetValue: "999999999999"
  });
};

// ===== Program Endpoints =====

/**
 * Get program TVL (Total Value Locked)
 * @param programId Program ID
 * @returns TVL information
 */
export const getProgramTVL = async (programId: string): Promise<any> => {
  return callVybeApi('get_program_tvl', {
    programAddress: programId,
    resolution: "1d"
  });
};

/**
 * Get program active users
 * @param programId Program ID
 * @param timeframe Timeframe (e.g., '24h', '7d')
 * @returns Active users information
 */
export const getProgramActiveUsers = async (
  programId: string,
  timeframe: string = '24h'
): Promise<any> => {
  // Convert string timeframe to number of days
  const days = timeframe === '24h' ? 1 : 
               timeframe === '7d' ? 7 : 
               timeframe === '30d' ? 30 : 1;
  
  return callVybeApi('get_program_active_users', {
    programAddress: programId,
    days
  });
};

/**
 * Get program transaction count
 * @param programId Program ID
 * @param timeframe Timeframe (e.g., '24h', '7d')
 * @returns Transaction count information
 */
export const getProgramTransactionCount = async (
  programId: string,
  timeframe: string = '24h'
): Promise<any> => {
  // Convert string timeframe to valid range value
  const range = timeframe === '24h' ? '1d' : 
                timeframe === '7d' ? '7d' : 
                timeframe === '30d' ? '30d' : '1d';
  
  return callVybeApi('get_program_transactions_count', {
    programAddress: programId,
    range
  });
};

// ===== Token Endpoints =====

/**
 * Get token information
 * @param mintAddress Token mint address
 * @returns Token information
 */
export const getTokenInfo = async (mintAddress: string): Promise<any> => {
  return callVybeApi('get_token_details', { mintAddress });
};

/**
 * Get token holders
 * @param mintAddress Token mint address
 * @returns Token holders information
 */
export const getTokenHolders = async (mintAddress: string): Promise<any> => {
  return callVybeApi('get_top_holders', { mintAddress });
};

/**
 * Get token price
 * @param mintAddress Token mint address
 * @returns Token price information
 */
export const getTokenPrice = async (mintAddress: string): Promise<any> => {
  return callVybeApi('get_token_trade_ohlc', { mintAddress, resolution: '1d', limit: 1 });
};

// ===== Market Endpoints =====

/**
 * Get market OHLCV (Open, High, Low, Close, Volume)
 * @param marketId Market ID
 * @param timeframe Timeframe (e.g., '1h', '1d')
 * @param limit Number of data points
 * @returns OHLCV information
 */
export const getMarketOHLCV = async (
  marketId: string,
  timeframe: "1d" | "7d" | "30d" = "1d",
  limit: number = 30
): Promise<any> => {
  return callVybeApi('get_market_filtered_ohlcv', { marketId, resolution: timeframe, limit });
};

/**
 * Get market pairs
 * @returns Market pairs information
 */
export const getMarketPairs = async (): Promise<any> => {
  return callVybeApi('get_markets', { programId: '' });
};

/**
 * Get token volume time series
 * @param mintAddress Token mint address
 * @param startTime Optional start time as unix timestamp
 * @param endTime Optional end time as unix timestamp
 * @param interval Time interval specifier
 * @param limit Result page size
 * @param page Page selection (0-indexed)
 * @returns Token volume time series data
 */
export const getTokenVolumeTimeSeries = async (params: {
  mintAddress: string;
  startTime?: number;
  endTime?: number;
  interval?: string;
  limit?: number;
  page?: number;
}): Promise<any> => {
  // Ensure we have the required parameters
  if (!params.mintAddress) {
    throw new Error('mintAddress is required for getTokenVolumeTimeSeries');
  }
  
  // Set default interval if not provided
  if (!params.interval) {
    params.interval = 'day';
  }
  
  return callVybeApi('get_token_volume_time_series', params);
};

// ===== Higher-level functions =====

/**
 * Get a comprehensive wallet summary including SOL, tokens, and NFTs
 * @param ownerAddress Wallet address
 * @returns Formatted wallet summary
 */
export const getWalletSummary = async (
  ownerAddress: string
): Promise<FormattedWalletSummary> => {
  try {
    // Get token and NFT balances in parallel
    const [tokenBalanceResponse, nftBalanceResponse] = await Promise.all([
      getTokenBalance(ownerAddress),
      getNftBalance(ownerAddress)
    ]);
    
    // Log the token balance response for debugging
    logger.debug('Token balance response in getWalletSummary:', {
      responseKeys: tokenBalanceResponse && typeof tokenBalanceResponse === 'object' ? Object.keys(tokenBalanceResponse) : [],
      hasData: tokenBalanceResponse && typeof tokenBalanceResponse === 'object' && 'data' in tokenBalanceResponse && Array.isArray(tokenBalanceResponse.data),
      dataLength: tokenBalanceResponse && typeof tokenBalanceResponse === 'object' && 'data' in tokenBalanceResponse && tokenBalanceResponse.data ? tokenBalanceResponse.data.length : 0,
      totalTokenValueUsd: tokenBalanceResponse && typeof tokenBalanceResponse === 'object' && 'totalTokenValueUsd' in tokenBalanceResponse ? tokenBalanceResponse.totalTokenValueUsd : 'not found'
    });
    
    // Find SOL in the data array
    let solBalance = 0;
    const tokens: {
      mint: string;
      symbol: string;
      balance: number;
      usdValue?: number;
    }[] = [];
    
    // Process token data from the response
    // Check if the data is nested inside a data property
    const tokenData = tokenBalanceResponse && typeof tokenBalanceResponse === 'object' && 'data' in tokenBalanceResponse ? 
      (tokenBalanceResponse.data && typeof tokenBalanceResponse.data === 'object' && 'data' in tokenBalanceResponse.data && Array.isArray(tokenBalanceResponse.data.data) ? 
        tokenBalanceResponse.data.data : 
        (Array.isArray(tokenBalanceResponse.data) ? tokenBalanceResponse.data : [])
      ) : [];
    
    // Log the token data structure
    logger.debug('Token data structure:', {
      tokenDataLength: tokenData.length,
      firstTokenSymbol: tokenData.length > 0 ? tokenData[0].symbol : 'none'
    });
    
    if (tokenData.length > 0) {
      tokenData.forEach((token: any) => {
        // Convert string amounts to numbers
        const balance = parseFloat(token.amount || '0');
        const usdValue = parseFloat(token.valueUsd || '0');
        
        // Check if this is SOL
        if (token.symbol === 'SOL' && token.mintAddress === '11111111111111111111111111111111') {
          solBalance = balance;
        }
        
        // Add to tokens array
        tokens.push({
          mint: token.mintAddress,
          symbol: token.symbol || 'Unknown',
          balance: balance,
          usdValue: usdValue
        });
      });
    }
    
    // Extract NFT balances
    const nfts = nftBalanceResponse.nfts?.map((nft: any) => ({
      mint: nft.mint,
      name: nft.name || 'Unknown NFT',
      collection: nft.collection?.name,
      image: nft.image
    })) || [];
    
    // Get total USD value from the response or calculate it
    let totalUsdValue = 0;
    
    // Check different possible locations for totalTokenValueUsd
    if (tokenBalanceResponse && typeof tokenBalanceResponse === 'object') {
      if ('totalTokenValueUsd' in tokenBalanceResponse) {
        totalUsdValue = parseFloat(tokenBalanceResponse.totalTokenValueUsd as string);
      } else if ('data' in tokenBalanceResponse && 
                typeof tokenBalanceResponse.data === 'object' && 
                tokenBalanceResponse.data && 
                'totalTokenValueUsd' in tokenBalanceResponse.data) {
        totalUsdValue = parseFloat(tokenBalanceResponse.data.totalTokenValueUsd as string);
      }
    } else {
      // Calculate from tokens if not available in response
      totalUsdValue = tokens.reduce(
        (sum: number, token: any) => sum + (token.usdValue || 0), 
        0
      );
    }
    
    return {
      owner: ownerAddress,
      solBalance,
      tokens,
      nfts,
      totalUsdValue
    };
  } catch (error: any) {
    logger.error('Failed to get wallet summary', { 
      ownerAddress, 
      error 
    });
    throw error;
  }
};

/**
 * Get comprehensive token information including price, holders, etc.
 * @param mintAddress Token mint address
 * @returns Formatted token information
 */
export const getDetailedTokenInfo = async (
  mintAddress: string
): Promise<FormattedTokenInfo> => {
  try {
    // Get token info and price in parallel
    const [tokenInfoResponse, tokenPriceResponse, tokenHoldersResponse] = await Promise.all([
      getTokenInfo(mintAddress),
      getTokenPrice(mintAddress).catch(() => null), // Price might not be available
      getTokenHolders(mintAddress).catch(() => ({ count: 0 })) // Holders might not be available
    ]);
    
    return {
      mint: mintAddress,
      symbol: tokenInfoResponse.symbol || 'Unknown',
      name: tokenInfoResponse.name || 'Unknown Token',
      decimals: tokenInfoResponse.decimals || 0,
      supply: tokenInfoResponse.supply || 0,
      holders: tokenHoldersResponse.count || 0,
      price: tokenPriceResponse ? {
        usd: tokenPriceResponse.price || 0,
        change24h: tokenPriceResponse.change24h
      } : undefined,
      volume: tokenPriceResponse ? {
        usd24h: tokenPriceResponse.volume24h || 0,
        change24h: tokenPriceResponse.volumeChange24h
      } : undefined
    };
  } catch (error: any) {
    logger.error('Failed to get detailed token info', { 
      mintAddress, 
      error 
    });
    throw error;
  }
};

/**
 * Get comprehensive program health information
 * @param programId Program ID
 * @returns Formatted program health information
 */
export const getProgramHealth = async (
  programId: string
): Promise<FormattedProgramHealth> => {
  try {
    // Get program TVL, active users, and transaction count in parallel
    const [tvlResponse, activeUsersResponse, transactionCountResponse] = await Promise.all([
      getProgramTVL(programId),
      getProgramActiveUsers(programId, '24h'),
      getProgramTransactionCount(programId, '24h')
    ]);
    
    return {
      programId,
      tvl: tvlResponse.tvl || 0,
      tvlChange24h: tvlResponse.change24h,
      activeUsers24h: activeUsersResponse.count || 0,
      activeUsersChange24h: activeUsersResponse.change24h,
      transactions24h: transactionCountResponse.count || 0,
      transactionsChange24h: transactionCountResponse.change24h
    };
  } catch (error: any) {
    logger.error('Failed to get program health', { 
      programId, 
      error 
    });
    throw error;
  }
};
