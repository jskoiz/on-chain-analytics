import { Schema, model, Document } from 'mongoose';

/**
 * Interface representing a User document in MongoDB
 */
export interface IUser extends Document {
  telegramId: string;
  wallets: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for the User model
 * - telegramId: Unique identifier for the Telegram user
 * - wallets: Array of Solana wallet addresses
 */
const userSchema = new Schema<IUser>(
  {
    telegramId: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },
    wallets: [{ 
      type: String,
      validate: {
        validator: (value: string) => {
          // Basic validation for Solana wallet addresses (base58 encoded, 32-44 chars)
          return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
        },
        message: (props: any) => `${props.value} is not a valid Solana wallet address`
      }
    }]
  },
  { 
    timestamps: true 
  }
);

/**
 * User model for storing Telegram user information and associated wallet addresses
 */
export const User = model<IUser>('User', userSchema);
