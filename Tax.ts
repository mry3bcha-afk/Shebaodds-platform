// ============================================
// SHEBAODDS - TAX MODEL
// Complete Tax Transaction Model for Statutory Compliance
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITaxTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  betId: mongoose.Types.ObjectId;
  matchId?: mongoose.Types.ObjectId;
  grossWinning: number;
  taxAmount: number;
  netWinning: number;
  taxRate: number;
  taxPeriod: string;
  taxReference: string;
  isExempt: boolean;
  exemptionReason?: string;
  status: string;
  deductedAt?: Date | null;
  calculatedAt: Date;
  remitted: boolean;
  remittanceId?: string;
  cbeTxnReference?: string;
}

const taxTransactionSchema = new Schema<ITaxTransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  betId: { type: Schema.Types.ObjectId, ref: 'Bet', required: true, index: true },
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', index: true },
  grossWinning: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  netWinning: { type: Number, required: true },
  taxRate: { type: Number, required: true },
  taxPeriod: { type: String, required: true, index: true },
  taxReference: { type: String, required: true, unique: true, index: true },
  isExempt: { type: Boolean, default: false, index: true },
  exemptionReason: String,
  status: { type: String, required: true },
  deductedAt: { type: Date },
  calculatedAt: { type: Date, default: Date.now, index: true },
  remitted: { type: Boolean, default: false, index: true },
  remittanceId: { type: String },
  cbeTxnReference: { type: String }
});

export interface ITaxSummary extends Document {
  taxPeriod: string; // YYYY-MM
  totalWinnings: number;
  totalTaxCollected: number;
  totalBets: number;
  totalUsers: number;
  userTaxDetails: {
    userId: mongoose.Types.ObjectId;
    username: string;
    totalWinnings: number;
    totalTax: number;
  }[];
  reported: boolean;
  reportedAt?: Date;
  reportReference?: string;
}

const taxSummarySchema = new Schema<ITaxSummary>({
  taxPeriod: { type: String, required: true, unique: true, index: true },
  totalWinnings: { type: Number, default: 0 },
  totalTaxCollected: { type: Number, default: 0 },
  totalBets: { type: Number, default: 0 },
  totalUsers: { type: Number, default: 0 },
  userTaxDetails: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    username: String,
    totalWinnings: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 }
  }],
  reported: { type: Boolean, default: false },
  reportedAt: Date,
  reportReference: String
});

export interface IUserTaxProfile extends Document {
  userId: mongoose.Types.ObjectId;
  taxId?: string;
  taxRegistrationNumber?: string;
  isTaxRegistered: boolean;
  taxExempt: boolean;
  exemptionType?: string;
  exemptionCertificate?: string;
  totalTaxPaid: number;
  totalWinningsTaxed: number;
  lastTaxCalculation?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userTaxProfileSchema = new Schema<IUserTaxProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  taxId: String,
  taxRegistrationNumber: String,
  isTaxRegistered: { type: Boolean, default: false },
  taxExempt: { type: Boolean, default: false },
  exemptionType: String,
  exemptionCertificate: String,
  totalTaxPaid: { type: Number, default: 0 },
  totalWinningsTaxed: { type: Number, default: 0 },
  lastTaxCalculation: Date
}, { timestamps: true });

export const TaxTransaction = (mongoose.models.TaxTransaction as Model<ITaxTransaction>) || mongoose.model<ITaxTransaction>('TaxTransaction', taxTransactionSchema);
export const TaxSummary = (mongoose.models.TaxSummary as Model<ITaxSummary>) || mongoose.model<ITaxSummary>('TaxSummary', taxSummarySchema);
export const UserTaxProfile = (mongoose.models.UserTaxProfile as Model<IUserTaxProfile>) || mongoose.model<IUserTaxProfile>('UserTaxProfile', userTaxProfileSchema);

// Export service methods so they are backward-compatible with any existing route imports
export { generateMonthlyTaxReport, submitTaxReport } from './taxService';

export default TaxTransaction;
