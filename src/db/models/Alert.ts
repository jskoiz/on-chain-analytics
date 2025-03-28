import { Schema, model, Document } from 'mongoose';

/**
 * Interface for price alert conditions
 */
export interface IPriceCondition {
  assetMint: string;      // Mint address of the token/pair base
  quoteMint?: string;     // Optional: For specific pairs via /price/{base}+{quote}/...
  marketId?: string;      // Optional: For specific market via /price/{marketId}/...
  threshold: number;      // Price threshold to trigger the alert
  operator: 'gt' | 'lt';  // Greater than or Less than
}

/**
 * Interface for balance alert conditions
 */
export interface IBalanceCondition {
  walletAddress: string;  // Specific wallet or 'all' for user's wallets
  assetMint: string;      // Token mint address
  threshold: number;      // Balance threshold to trigger the alert
  operator: 'gt' | 'lt';  // Greater than or Less than
}

/**
 * Interface for TVL (Total Value Locked) alert conditions
 */
export interface ITVLCondition {
  programId: string;      // Solana program ID
  threshold: number;      // TVL threshold to trigger the alert
  operator: 'gt' | 'lt';  // Greater than or Less than
}

/**
 * Interface for active users alert conditions
 */
export interface IActiveUsersCondition {
  programId: string;      // Solana program ID
  threshold: number;      // Active users threshold to trigger the alert
  operator: 'gt' | 'lt';  // Greater than or Less than
  timeframe?: string;     // Optional: Timeframe for active users (e.g., '24h', '7d')
}

/**
 * Union type for all possible alert conditions
 */
export type AlertCondition = 
  | IPriceCondition 
  | IBalanceCondition 
  | ITVLCondition 
  | IActiveUsersCondition;

/**
 * Interface representing an Alert document in MongoDB
 */
export interface IAlert extends Document {
  telegramId: string;
  alertType: 'price' | 'balance' | 'tvl' | 'activeUsers';
  label?: string;
  condition: AlertCondition;
  isEnabled: boolean;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for the Alert model
 */
const alertSchema = new Schema<IAlert>(
  {
    telegramId: { 
      type: String, 
      required: true, 
      index: true 
    },
    alertType: { 
      type: String, 
      required: true, 
      enum: ['price', 'balance', 'tvl', 'activeUsers'],
      index: true 
    },
    label: { 
      type: String 
    },
    condition: { 
      type: Schema.Types.Mixed, 
      required: true 
    },
    isEnabled: { 
      type: Boolean, 
      default: true,
      index: true 
    },
    lastTriggeredAt: { 
      type: Date 
    }
  },
  { 
    timestamps: true 
  }
);

// Add compound index for efficient querying
alertSchema.index({ telegramId: 1, isEnabled: 1 });

/**
 * Alert model for storing user alert configurations
 */
export const Alert = model<IAlert>('Alert', alertSchema);
