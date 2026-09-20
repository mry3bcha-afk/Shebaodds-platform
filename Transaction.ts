// ============================================
// SHEBAODDS - TRANSACTION MODEL
// Complete Financial Transaction Schema
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  BET_PLACE: 'bet_place',
  BET_WIN: 'bet_win',
  BET_LOSS: 'bet_loss',
  BONUS: 'bonus',
  CASHBACK: 'cashback',
  REFUND: 'refund',
  ADJUSTMENT: 'adjustment',
  TAX: 'tax',
  FEE: 'fee',
  TRANSFER: 'transfer',
  PROMOTION: 'promotion',
  JACKPOT: 'jackpot'
} as const;

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];

export const PAYMENT_METHODS = {
  TELE_BIRR: 'tele_birr',
  CBE: 'cbe',
  CHAPA: 'chapa',
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  CRYPTO_BTC: 'crypto_btc',
  CRYPTO_ETH: 'crypto_eth',
  CRYPTO_USDT: 'crypto_usdt',
  BANK_TRANSFER: 'bank_transfer',
  BONUS: 'bonus',
  CASH: 'cash'
} as const;

export type PaymentMethodType = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
} as const;

export type TransactionStatusType = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  betId?: mongoose.Types.ObjectId;
  bonusId?: mongoose.Types.ObjectId;
  
  type: TransactionType;
  subType?: string;
  amount: number;
  fee: number;
  taxAmount: number;
  netAmount: number;
  
  paymentMethod?: PaymentMethodType;
  paymentReference?: string;
  paymentGatewayReference?: string;
  
  paymentDetails: {
    phoneNumber?: string;
    accountNumber?: string;
    transactionId?: string;
    
    cardLast4?: string;
    cardBrand?: string;
    cardExpiry?: string;
    
    cryptoCurrency?: string;
    cryptoAddress?: string;
    cryptoTxHash?: string;
    cryptoConfirmations: number;
    
    bankName?: string;
    bankAccount?: string;
    bankReference?: string;
    
    notes?: string;
    metadata?: any;
  };
  
  previousBalance: number;
  previousBonusBalance: number;
  newBalance: number;
  newBonusBalance: number;
  
  status: TransactionStatusType;
  failureReason?: string;
  failureCode?: string;
  
  requiresApproval: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
  };
  
  notes?: string;
  metadata?: any;
  
  createdAt: Date;
  completedAt?: Date;
  updatedAt: Date;

  // Virtual Fields
  isDeposit: boolean;
  isWithdrawal: boolean;
  isCredit: boolean;
  isDebit: boolean;

  // Instance Methods
  complete(): Promise<ITransaction>;
  fail(reason: string, code?: string): Promise<ITransaction>;
  approve(adminId: mongoose.Types.ObjectId): Promise<ITransaction>;
}

export interface ITransactionModel extends Model<ITransaction> {
  getUserBalance(userId: string | mongoose.Types.ObjectId): Promise<number>;
  getUserDepositTotal(userId: string | mongoose.Types.ObjectId): Promise<number>;
}

const transactionSchema = new Schema<ITransaction, ITransactionModel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  betId: { type: Schema.Types.ObjectId, ref: 'Bet', index: true },
  bonusId: { type: Schema.Types.ObjectId, ref: 'Bonus', index: true },
  
  type: { type: String, enum: Object.values(TRANSACTION_TYPES), required: true, index: true },
  subType: { type: String },
  amount: { type: Number, required: true },
  fee: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },
  
  paymentMethod: { type: String, enum: Object.values(PAYMENT_METHODS), index: true },
  paymentReference: { type: String, unique: true, sparse: true, index: true },
  paymentGatewayReference: { type: String, index: true },
  
  paymentDetails: {
    phoneNumber: String,
    accountNumber: String,
    transactionId: String,
    
    cardLast4: String,
    cardBrand: String,
    cardExpiry: String,
    
    cryptoCurrency: String,
    cryptoAddress: String,
    cryptoTxHash: String,
    cryptoConfirmations: { type: Number, default: 0 },
    
    bankName: String,
    bankAccount: String,
    bankReference: String,
    
    notes: String,
    metadata: Schema.Types.Mixed
  },
  
  previousBalance: { type: Number, required: true },
  previousBonusBalance: { type: Number, default: 0 },
  newBalance: { type: Number, required: true },
  newBonusBalance: { type: Number, default: 0 },
  
  status: { type: String, enum: Object.values(TRANSACTION_STATUS), default: TRANSACTION_STATUS.PENDING, index: true },
  failureReason: String,
  failureCode: String,
  
  requiresApproval: { type: Boolean, default: false },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  
  ipAddress: String,
  userAgent: String,
  location: {
    country: String,
    city: String
  },
  
  notes: String,
  metadata: Schema.Types.Mixed,
  
  createdAt: { type: Date, default: Date.now, index: true },
  completedAt: Date,
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
// paymentReference already gets a single-field index from `index: true` (with
// unique+sparse) on its field definition — duplicate standalone index removed.
// createdAt already gets a single-field index from `index: true` on its field
// definition above — duplicate standalone index removed from here.

// ==================== VIRTUAL FIELDS ====================
transactionSchema.virtual('isDeposit').get(function(this: ITransaction) {
  return this.type === TRANSACTION_TYPES.DEPOSIT;
});

transactionSchema.virtual('isWithdrawal').get(function(this: ITransaction) {
  return this.type === TRANSACTION_TYPES.WITHDRAWAL;
});

transactionSchema.virtual('isCredit').get(function(this: ITransaction) {
  return [TRANSACTION_TYPES.DEPOSIT, TRANSACTION_TYPES.BET_WIN, TRANSACTION_TYPES.BONUS, 
          TRANSACTION_TYPES.CASHBACK, TRANSACTION_TYPES.REFUND, TRANSACTION_TYPES.JACKPOT].includes(this.type as any);
});

transactionSchema.virtual('isDebit').get(function(this: ITransaction) {
  return [TRANSACTION_TYPES.BET_PLACE, TRANSACTION_TYPES.WITHDRAWAL, 
          TRANSACTION_TYPES.FEE, TRANSACTION_TYPES.TAX].includes(this.type as any);
});

// ==================== INSTANCE METHODS ====================
transactionSchema.methods.complete = function(this: ITransaction): Promise<ITransaction> {
  this.status = TRANSACTION_STATUS.COMPLETED;
  this.completedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

transactionSchema.methods.fail = function(this: ITransaction, reason: string, code?: string): Promise<ITransaction> {
  this.status = TRANSACTION_STATUS.FAILED;
  this.failureReason = reason;
  if (code) this.failureCode = code;
  this.updatedAt = new Date();
  return this.save();
};

transactionSchema.methods.approve = function(this: ITransaction, adminId: mongoose.Types.ObjectId): Promise<ITransaction> {
  this.requiresApproval = false;
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.status = TRANSACTION_STATUS.PROCESSING;
  return this.save();
};

// ==================== STATIC METHODS ====================
transactionSchema.statics.getUserBalance = async function(this: ITransactionModel, userId: string | mongoose.Types.ObjectId): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: TRANSACTION_STATUS.COMPLETED } },
    { $group: {
      _id: null,
      totalCredit: { $sum: { $cond: [{ $in: ['$type', 
        [TRANSACTION_TYPES.DEPOSIT, TRANSACTION_TYPES.BET_WIN, TRANSACTION_TYPES.BONUS, 
         TRANSACTION_TYPES.CASHBACK, TRANSACTION_TYPES.REFUND] ] }, '$netAmount', 0] } },
      totalDebit: { $sum: { $cond: [{ $in: ['$type', 
        [TRANSACTION_TYPES.BET_PLACE, TRANSACTION_TYPES.WITHDRAWAL, TRANSACTION_TYPES.FEE, TRANSACTION_TYPES.TAX] ] }, '$netAmount', 0] } }
    }}
  ]);
  
  return (result[0]?.totalCredit || 0) - (result[0]?.totalDebit || 0);
};

transactionSchema.statics.getUserDepositTotal = async function(this: ITransactionModel, userId: string | mongoose.Types.ObjectId): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), type: TRANSACTION_TYPES.DEPOSIT, status: TRANSACTION_STATUS.COMPLETED } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result[0]?.total || 0;
};

export const Transaction = (mongoose.models.Transaction as ITransactionModel) || mongoose.model<ITransaction, ITransactionModel>('Transaction', transactionSchema);
export default Transaction;
