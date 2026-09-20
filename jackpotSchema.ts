import mongoose, { Schema, Document } from 'mongoose';

// 1. The Master Jackpot Event Session Schema
interface IJackpotPool extends Document {
  title: string;          // e.g., "Grand Weekend 12 Jackpot"
  matchIds: number[];     // Array of 12 provider match IDs
  grandPrize: number;     // e.g., 100000 (ETB)
  entryFee: number;       // e.g., 50 (ETB)
  status: 'Open' | 'Locked' | 'Settled';
  results?: string[];     // Array of 12 outcomes ("1", "X", or "2") once matches finish
}

const JackpotPoolSchema = new Schema<IJackpotPool>({
  title: { type: String, required: true },
  matchIds: { type: [Number], validate: [val => val.length === 12, 'Must contain exactly 12 games'] },
  grandPrize: { type: Number, default: 100000 },
  entryFee: { type: Number, default: 50 },
  status: { type: String, enum: ['Open', 'Locked', 'Settled'], default: 'Open' },
  results: [String]
}, { timestamps: true });

// 2. The User Ticket Entry Schema
interface IJackpotTicket extends Document {
  jackpotPoolId: mongoose.Types.ObjectId;
  userId: string;
  predictions: string[]; // Array of 12 guesses: ["1", "X", "2", "1", ...]
  correctGuessesCount: number;
  isWinner: boolean;
}

const JackpotTicketSchema = new Schema<IJackpotTicket>({
  jackpotPoolId: { type: Schema.Types.ObjectId, ref: 'JackpotPool', required: true },
  userId: { type: String, required: true, index: true },
  predictions: { type: [String], required: true },
  correctGuessesCount: { type: Number, default: 0 },
  isWinner: { type: Boolean, default: false }
}, { timestamps: true });

export const JackpotPool = mongoose.model<IJackpotPool>('JackpotPool', JackpotPoolSchema);
export const JackpotTicket = mongoose.model<IJackpotTicket>('JackpotTicket', JackpotTicketSchema);
