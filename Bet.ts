// ============================================
// SHEBAODDS - BET MODEL
// Complete Bet Schema with Cashout & Tax
// SUPPORTS: 51+ CASINO GAMES INTEGRATION
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose';

export const BET_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  WON: 'won',
  LOST: 'lost',
  CASHED_OUT: 'cashed_out',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_WON: 'partially_won',
  VOID: 'void'
} as const;

export type BetStatusType = typeof BET_STATUS[keyof typeof BET_STATUS];

export interface IBetSelection {
  matchId?: mongoose.Types.ObjectId;
  marketType?: string;
  selection?: string;
  odds?: number;
  status?: string;
  outcome?: string;
  actualOdds?: number;
  settledAt?: Date;
}

export interface IBetSystemBet {
  selections?: number[];
  combinedOdds?: number;
  stake?: number;
  potentialWin?: number;
  status?: string;
  actualWin?: number;
}

export interface IBet extends Document {
  userId: mongoose.Types.ObjectId;
  
  // --- Sportsbook Fields ---
  matchId?: mongoose.Types.ObjectId; // Made optional for Casino bets

  // --- Casino Fields (NEW) ---
  isCasinoBet: boolean;             // True if this is a Casino game
  casinoGameId?: string;            // e.g. 'aviator', 'dice', 'slot'
  casinoMultiplier?: number;        // The multiplier achieved in crash games

  // --- Core Bet Details ---
  betType: string; // single, accumulator, system, bet_builder, casino
  marketType: string;
  selection: string;
  odds: number;
  stake: number;
  potentialWin: number;
  actualWin: number;

  // --- Tax Information (15% Ethiopian Tax) ---
  taxAmount: number;
  taxRate: number;
  netWin: number;
  taxTransactionId?: mongoose.Types.ObjectId;
  isTaxExempt: boolean;
  taxExemptReason?: string;

  // --- Single Bet ---
  isSingle: boolean;

  // --- Accumulator Bets ---
  isAccumulator: boolean;
  accumulatorId?: string;
  accumulatorSelections: IBetSelection[];
  combinedOdds: number;
  accumulatorType?: 'accumulator' | 'trixie' | 'yankee' | 'patent' | 'lucky15' | 'canadian' | 'heinz' | 'super_heinz' | 'goliath';

  // --- System Bet ---
  isSystemBet: boolean;
  systemBetType?: 'trixie' | 'yankee' | 'patent' | 'lucky15' | 'lucky31' | 'lucky63' | 'canadian' | 'heinz' | 'super_heinz' | 'goliath';
  systemSelections: Array<{
    matchId?: mongoose.Types.ObjectId;
    selection?: string;
    odds?: number;
  }>;
  systemBets: IBetSystemBet[];
  totalSystemStake?: number;
  numberOfBets?: number;

  // --- Bet Builder ---
  isBetBuilder: boolean;
  betBuilderSelections: Array<{
    marketType?: string;
    selection?: string;
    odds?: number;
    isLive?: boolean;
  }>;

  // --- Live Betting ---
  isLive: boolean;
  betPlacedAtMinute?: number;
  liveOddsAtBetTime?: {
    homeWin?: number;
    draw?: number;
    awayWin?: number;
  };

  // --- Cash Out Support ---
  cashOutAvailable: boolean;
  cashOutAmount?: number;
  cashOutMultiplier?: number;
  cashOutPercentage?: number;
  cashedOutAt?: Date;
  autoCashOutMultiplier?: number;
  autoCashOutTriggered: boolean;
  autoCashOutAmount?: number;

  // --- Partial Settlement ---
  isPartialWin: boolean;
  isPartialLoss: boolean;
  isPush: boolean;
  partialWinPercentage?: number;
  partialLossPercentage?: number;

  // --- Period ---
  period: 'full' | 'first_half' | 'second_half' | 'extra_time' | 'penalties';

  // --- Status Tracking ---
  status: string;
  statusHistory: Array<{
    status?: string;
    timestamp?: Date;
    reason?: string;
    updatedBy?: string;
  }>;

  // --- Settlement ---
  settledAt?: Date;
  settledBy?: string;
  settledScore?: string;
  actualOutcome?: string;

  // --- Verification ---
  verifiedByAdmin: boolean;
  verifiedAt?: Date;
  verificationNote?: string;

  // --- Device & Location Info ---
  deviceInfo?: {
    deviceId?: string;
    platform?: string;
    browser?: string;
    os?: string;
  };
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };

  // --- Bonus Information ---
  bonusId?: mongoose.Types.ObjectId;
  bonusAmountUsed: number;
  usedRealBalance: number;
  usedBonusBalance: number;

  // --- Metadata ---
  metadata?: any;
  notes?: string;

  // --- Timestamps ---
  createdAt: Date;
  updatedAt: Date;

  // --- Virtual Fields ---
  isSettled: boolean;
  profit: number;
  roi: number;

  // --- Instance Methods ---
  calculatePotentialWin(): number;
  calculateTax(): { taxAmount: number; netWin: number };
  checkCashOutAvailability(currentMinute: number, currentLiveOdds: any): boolean;
  updateStatus(newStatus: string, reason?: string): Promise<IBet>;
}

export interface IBetModel extends Model<IBet> {
  getUserBetStats(userId: string): Promise<any>;
}

const betSchema = new Schema<IBet, IBetModel>({
  // --- References ---
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', index: true }, // Optional now

  // --- Casino Integration Fields ---
  isCasinoBet: { type: Boolean, default: false },
  casinoGameId: { type: String, index: true }, // e.g. 'aviator', 'dice'
  casinoMultiplier: { type: Number },

  // --- Bet Details ---
  betType: { type: String, required: true },
  marketType: { type: String, required: true, index: true },
  selection: { type: String, required: true },
  odds: { type: Number, required: true, min: 1.01 },
  stake: { type: Number, required: true, min: 1 },
  potentialWin: { type: Number, required: true },
  actualWin: { type: Number, default: 0 },

  // --- Tax Information (15% Ethiopian Tax) ---
  taxAmount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0.15 },
  netWin: { type: Number, default: 0 },
  taxTransactionId: { type: Schema.Types.ObjectId, ref: 'TaxTransaction' },
  isTaxExempt: { type: Boolean, default: false },
  taxExemptReason: String,

  // --- Single Bet ---
  isSingle: { type: Boolean, default: true },

  // --- Accumulator Bets ---
  isAccumulator: { type: Boolean, default: false },
  accumulatorId: { type: String, index: true },
  accumulatorSelections: [{
    matchId: { type: Schema.Types.ObjectId, ref: 'Match' },
    marketType: String,
    selection: String,
    odds: Number,
    status: { type: String, enum: Object.values(BET_STATUS), default: BET_STATUS.PENDING },
    outcome: String,
    actualOdds: Number,
    settledAt: Date
  }],
  combinedOdds: { type: Number, default: 1 },
  accumulatorType: { type: String, enum: ['accumulator', 'trixie', 'yankee', 'patent', 'lucky15', 'canadian', 'heinz', 'super_heinz', 'goliath'] },

  // --- System Bet ---
  isSystemBet: { type: Boolean, default: false },
  systemBetType: { type: String, enum: ['trixie', 'yankee', 'patent', 'lucky15', 'lucky31', 'lucky63', 'canadian', 'heinz', 'super_heinz', 'goliath'] },
  systemSelections: [{
    matchId: Schema.Types.ObjectId,
    selection: String,
    odds: Number
  }],
  systemBets: [{
    selections: [Number],
    combinedOdds: Number,
    stake: Number,
    potentialWin: Number,
    status: String,
    actualWin: Number
  }],
  totalSystemStake: Number,
  numberOfBets: Number,

  // --- Bet Builder ---
  isBetBuilder: { type: Boolean, default: false },
  betBuilderSelections: [{
    marketType: String,
    selection: String,
    odds: Number,
    isLive: { type: Boolean, default: false }
  }],

  // --- Live Betting ---
  isLive: { type: Boolean, default: false },
  betPlacedAtMinute: Number,
  liveOddsAtBetTime: {
    homeWin: Number,
    draw: Number,
    awayWin: Number
  },

  // --- Cash Out Support ---
  cashOutAvailable: { type: Boolean, default: false },
  cashOutAmount: Number,
  cashOutMultiplier: Number,
  cashOutPercentage: Number,
  cashedOutAt: Date,
  autoCashOutMultiplier: Number,
  autoCashOutTriggered: { type: Boolean, default: false },
  autoCashOutAmount: Number,

  // --- Partial Settlement ---
  isPartialWin: { type: Boolean, default: false },
  isPartialLoss: { type: Boolean, default: false },
  isPush: { type: Boolean, default: false },
  partialWinPercentage: Number,
  partialLossPercentage: Number,

  // --- Period ---
  period: { type: String, default: 'full', enum: ['full', 'first_half', 'second_half', 'extra_time', 'penalties'] },

  // --- Status Tracking ---
  status: { type: String, default: BET_STATUS.PENDING, index: true },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    reason: String,
    updatedBy: String
  }],

  // --- Settlement ---
  settledAt: Date,
  settledBy: String,
  settledScore: String,
  actualOutcome: String,

  // --- Verification ---
  verifiedByAdmin: { type: Boolean, default: false },
  verifiedAt: Date,
  verificationNote: String,

  // --- Device & Location Info ---
  deviceInfo: {
    deviceId: String,
    platform: String,
    browser: String,
    os: String
  },
  ipAddress: String,
  location: {
    country: String,
    city: String,
    lat: Number,
    lng: Number
  },

  // --- Bonus Information ---
  bonusId: { type: Schema.Types.ObjectId, ref: 'Bonus' },
  bonusAmountUsed: { type: Number, default: 0 },
  usedRealBalance: { type: Number, default: 0 },
  usedBonusBalance: { type: Number, default: 0 },

  // --- Metadata ---
  metadata: Schema.Types.Mixed,
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================
betSchema.index({ userId: 1, createdAt: -1 });
betSchema.index({ userId: 1, status: 1 });
betSchema.index({ matchId: 1, status: 1 });
// accumulatorId already gets a single-field index from `index: true` on its
// field definition — duplicate standalone index removed from here.
betSchema.index({ createdAt: -1 });
betSchema.index({ status: 1, createdAt: -1 });
betSchema.index({ isLive: 1, status: 1 });
betSchema.index({ isCasinoBet: 1, status: 1 }); // New index for Casino games
betSchema.index({ 'accumulatorSelections.status': 1 });

// ==================== VIRTUAL FIELDS ====================
betSchema.virtual('isSettled').get(function(this: IBet) {
  return [BET_STATUS.WON, BET_STATUS.LOST, BET_STATUS.CASHED_OUT, BET_STATUS.REFUNDED, BET_STATUS.VOID].includes(this.status as any);
});

betSchema.virtual('profit').get(function(this: IBet) {
  if (this.status === BET_STATUS.WON) return this.actualWin - this.stake;
  if (this.status === BET_STATUS.LOST) return -this.stake;
  if (this.status === BET_STATUS.CASHED_OUT) return (this.cashOutAmount || 0) - this.stake;
  return 0;
});

betSchema.virtual('roi').get(function(this: IBet) {
  if (this.stake === 0) return 0;
  return (this.profit / this.stake) * 100;
});

// ==================== INSTANCE METHODS ====================
betSchema.methods.calculatePotentialWin = function(this: IBet): number {
  if (this.isCasinoBet && this.casinoMultiplier) {
    this.potentialWin = this.stake * this.casinoMultiplier;
    return this.potentialWin;
  }

  let totalOdds = this.odds;
  if (this.isAccumulator && this.accumulatorSelections.length > 0) {
    totalOdds = this.accumulatorSelections.reduce((acc, sel) => acc * (sel.odds || 1), 1);
    this.combinedOdds = totalOdds;
  }
  this.potentialWin = this.stake * totalOdds;
  return this.potentialWin;
};

betSchema.methods.calculateTax = function(this: IBet): { taxAmount: number; netWin: number } {
  const TAX_RATE = 0.15;
  const TAX_FREE_LIMIT = 100;

  let winningAmount = this.actualWin;
  if (this.status === BET_STATUS.CASHED_OUT) winningAmount = this.cashOutAmount || 0;

  if (winningAmount <= TAX_FREE_LIMIT || this.isTaxExempt) {
    this.taxAmount = 0;
    this.netWin = winningAmount;
    return { taxAmount: 0, netWin: winningAmount };
  }

  this.taxAmount = winningAmount * TAX_RATE;
  this.netWin = winningAmount - this.taxAmount;
  return { taxAmount: this.taxAmount, netWin: this.netWin };
};

betSchema.methods.checkCashOutAvailability = function(this: IBet, currentMinute: number, currentLiveOdds: any): boolean {
  // Casino games do not support Cash Out (This remains Sportsbook only)
  if (this.isCasinoBet) {
    this.cashOutAvailable = false;
    return false;
  }

  if (this.status !== BET_STATUS.PENDING && this.status !== BET_STATUS.RUNNING) {
    this.cashOutAvailable = false;
    return false;
  }

  if (!this.isLive && !this.isAccumulator) {
    this.cashOutAvailable = false;
    return false;
  }

  const progress = Math.min(0.95, currentMinute / 90);
  let currentOdds = this.odds;

  if (this.marketType === 'ft_1x2' && currentLiveOdds) {
    if (this.selection === 'Home Win' && currentLiveOdds.homeWin) currentOdds = currentLiveOdds.homeWin;
    else if (this.selection === 'Draw' && currentLiveOdds.draw) currentOdds = currentLiveOdds.draw;
    else if (this.selection === 'Away Win' && currentLiveOdds.awayWin) currentOdds = currentLiveOdds.awayWin;
  }

  const baseValue = (this.stake * currentOdds) / this.odds;
  const reduction = progress * 0.3;
  let cashOut = baseValue * (1 - reduction);
  cashOut = Math.max(this.stake * 0.3, Math.min(this.stake * this.odds * 0.95, cashOut));

  this.cashOutAvailable = cashOut > this.stake * 0.3;
  this.cashOutAmount = Math.floor(cashOut * 100) / 100;
  this.cashOutMultiplier = cashOut / this.stake;
  this.cashOutPercentage = (cashOut / this.potentialWin) * 100;

  return this.cashOutAvailable;
};

betSchema.methods.updateStatus = function(this: IBet, newStatus: string, reason = ''): Promise<IBet> {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    reason: reason
  });
  if ([BET_STATUS.WON, BET_STATUS.LOST, BET_STATUS.CASHED_OUT, BET_STATUS.REFUNDED].includes(newStatus as any)) {
    this.settledAt = new Date();
  }
  this.updatedAt = new Date();
  return this.save();
};

// ==================== STATIC METHODS ====================
betSchema.statics.getUserBetStats = async function(this: IBetModel, userId: string) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: {
      _id: null,
      totalBets: { $sum: 1 },
      totalStake: { $sum: '$stake' },
      totalWin: { $sum: '$actualWin' },
      totalCashout: { $sum: { $cond: [{ $eq: ['$status', 'cashed_out'] }, '$cashOutAmount', 0] } },
      wonBets: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
      lostBets: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
      cashedOutBets: { $sum: { $cond: [{ $eq: ['$status', 'cashed_out'] }, 1, 0] } },
      pendingBets: { $sum: { $cond: [{ $in: ['$status', ['pending', 'running']] }, 1, 0] } }
    }}
  ]);

  const result = stats[0] || { totalBets: 0, totalStake: 0, totalWin: 0, totalCashout: 0, wonBets: 0, lostBets: 0, cashedOutBets: 0, pendingBets: 0 };
  result.winRate = result.totalBets ? (result.wonBets / result.totalBets) * 100 : 0;
  result.roi = result.totalStake ? ((result.totalWin + result.totalCashout - result.totalStake) / result.totalStake) * 100 : 0;

  return result;
};

export const Bet = (mongoose.models.Bet as IBetModel) || mongoose.model<IBet, IBetModel>('Bet', betSchema);
export default Bet;