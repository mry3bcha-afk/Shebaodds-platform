// ============================================
// SHEBAODDS - USER MODEL
// Enterprise Grade User Schema
// SUPPORTS: Sportsbook & Casino Games
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Dynamically require speakeasy to bypass strict type declarations if types are missing
const speakeasy = require('speakeasy');

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  passwordHistory?: string[];
  phone: string;
  fullName?: string;
  dateOfBirth?: Date;
  country: string;
  city?: string;
  address?: string;
  postalCode?: string;

  language: string;
  theme: string;
  currency: string;
  timezone: string;

  wallet: {
    balance: number;
    bonusBalance: number;
    lockedBalance: number;
    currency: string;
    totalDeposited: number;
    totalWithdrawn: number;
    totalWagered: number;
    totalWon: number;
    totalLost: number;
    totalTaxPaid: number;
    totalBonusReceived: number;
    totalCashbackReceived: number;
  };

  statistics: {
    totalBets: number;
    totalWins: number;
    totalLosses: number;
    winningPercentage: number;
    currentWinStreak: number;
    longestWinStreak: number;
    biggestWin: number;
    biggestLoss: number;
    averageOdds: number;
  };

  vip: {
    level: number;
    name: string;
    loyaltyPoints: number;
    cashbackPercentage: number;
    personalManager: boolean;
    higherLimits: boolean;
    exclusivePromotions: boolean;
    fasterWithdrawals: boolean;
  };

  taxProfile: {
    taxExempt: boolean;
    taxId?: string;
    taxRegistrationNumber?: string;
    isTaxRegistered: boolean;
    totalTaxPaid: number;
    totalWinningsTaxed: number;
    lastTaxCalculation?: Date;
  };

  isActive: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  isBlocked: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  suspensionEndDate?: Date;

  kycDocuments: Array<{
    type: 'national_id' | 'passport' | 'drivers_license' | 'proof_of_address' | 'selfie';
    documentUrl?: string;
    documentNumber?: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    rejectionReason?: string;
    verifiedAt?: Date;
    verifiedBy?: string;
  }>;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycLevel: number;

  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  phoneVerificationCode?: string;
  phoneVerificationExpires?: Date;

  loginAttempts: number;
  lockedUntil?: Date;
  lastLoginIP?: string;
  lastLoginLocation?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };

  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  referralCount: number;
  referralEarnings: number;
  referralTier: number;

  responsibleGambling: {
    depositLimit: number;
    lossLimit: number;
    wagerLimit: number;
    sessionTimeout: number;
    realityCheckInterval: number;
    selfExcluded: boolean;
    selfExclusionEndDate?: Date;
    coolingOffPeriodEnd?: Date;
    lastRealityCheck?: Date;
  };

  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    betSettlements: boolean;
    promotions: boolean;
    aiTips: boolean;
    systemUpdates: boolean;
    securityAlerts: boolean;
  };

  devices: Array<{
    deviceId: string;
    deviceName?: string;
    platform?: 'web' | 'ios' | 'android' | 'admin';
    browser?: string;
    os?: string;
    ipAddress?: string;
    location?: string;
    pushToken?: string;
    biometricEnabled: boolean;
    biometricPublicKey?: string;
    lastUsed: Date;
    isActive: boolean;
  }>;

  sessions: Array<{
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    loginAt: Date;
    lastActivity: Date;
    expiresAt?: Date;
  }>;

  savedPaymentMethods: Array<{
    type: 'tele_birr' | 'cbe' | 'card' | 'paypal' | 'crypto' | 'bank_transfer';
    identifier?: string;
    last4?: string;
    brand?: string;
    isDefault: boolean;
    addedAt: Date;
    metadata?: any;
  }>;

  bettingPreferences: {
    defaultStake: number;
    autoCashoutMultiplier: number;
    favoriteLeagues: string[];
    favoriteTeams: string[];
    excludedMarkets: string[];
  };

  affiliate: {
    partnerId?: string;
    commissionRate: number;
    totalCommission: number;
    paidCommission: number;
  };

  notes: Array<{
    note?: string;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
  }>;

  lastLogin?: Date;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateReferralCode(): string;
  generateTwoFactorSecret(): any;
  verifyTwoFactorToken(token: string): boolean;
  generateBackupCodes(): string[];
  verifyBackupCode(code: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  updateVipLevel(): void;
  canPlaceBet(amount: number): boolean;
  getDepositLimit(): number;
}

// Alias expected by authRoutes.ts (imports `UserDocument`) — kept as a type
// alias rather than renaming IUser everywhere else it's used.
export type UserDocument = IUser;

export interface IUserModel extends Model<IUser> {
  findByEmailOrUsername(identifier: string): Promise<IUser | null>;
  getTopWagered(limit?: number): Promise<any[]>;
  getOnlineUsers(): Promise<number>;
}

const userSchema = new Schema<IUser, IUserModel>({
  // Basic Information
  username: { 
    type: String, 
    unique: true, 
    required: [true, 'Username is required'],
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscore'],
    index: true 
  },
  email: { 
    type: String, 
    unique: true, 
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    index: true 
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false 
  },
  passwordHistory: {
    type: [String],
    default: [],
    select: false
  },
  phone: { 
    type: String, 
    required: [true, 'Phone number is required'],
    unique: true,
    index: true,
    match: [/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number']
  },
  fullName: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  dateOfBirth: { type: Date },
  country: { type: String, default: 'Ethiopia' },
  city: { type: String },
  address: { type: String },
  postalCode: { type: String },

  // Preferences
  language: { type: String, default: 'en', enum: ['en', 'am', 'ar', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh'] },
  theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
  currency: { type: String, default: 'ETB', enum: ['ETB', 'USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT'] },
  timezone: { type: String, default: 'Africa/Addis_Ababa' },

  // Wallet System - Complete
  wallet: {
    balance: { type: Number, default: 0, min: 0 },
    bonusBalance: { type: Number, default: 0, min: 0 },
    lockedBalance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'ETB' },
    totalDeposited: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    totalWagered: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 },
    totalLost: { type: Number, default: 0 },
    totalTaxPaid: { type: Number, default: 0 },
    totalBonusReceived: { type: Number, default: 0 },
    totalCashbackReceived: { type: Number, default: 0 }
  },

  // Statistics
  statistics: {
    totalBets: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalLosses: { type: Number, default: 0 },
    winningPercentage: { type: Number, default: 0 },
    currentWinStreak: { type: Number, default: 0 },
    longestWinStreak: { type: Number, default: 0 },
    biggestWin: { type: Number, default: 0 },
    biggestLoss: { type: Number, default: 0 },
    averageOdds: { type: Number, default: 0 }
  },

  // VIP & Loyalty (1xBet Style)
  vip: {
    level: { type: Number, default: 0, enum: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    name: { type: String, default: 'Bronze' },
    loyaltyPoints: { type: Number, default: 0 },
    cashbackPercentage: { type: Number, default: 0 },
    personalManager: { type: Boolean, default: false },
    higherLimits: { type: Boolean, default: false },
    exclusivePromotions: { type: Boolean, default: false },
    fasterWithdrawals: { type: Boolean, default: false }
  },

  // Tax Profile
  taxProfile: {
    taxExempt: { type: Boolean, default: false },
    taxId: { type: String, sparse: true },
    taxRegistrationNumber: { type: String, sparse: true },
    isTaxRegistered: { type: Boolean, default: false },
    totalTaxPaid: { type: Number, default: 0 },
    totalWinningsTaxed: { type: Number, default: 0 },
    lastTaxCalculation: { type: Date }
  },

  // Account Status
  isActive: { type: Boolean, default: true, index: true },
  isAdmin: { type: Boolean, default: false, index: true },
  isVerified: { type: Boolean, default: false, index: true },
  isBlocked: { type: Boolean, default: false, index: true },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: { type: String },
  suspensionEndDate: { type: Date },

  // KYC Documents
  kycDocuments: [{
    type: { type: String, enum: ['national_id', 'passport', 'drivers_license', 'proof_of_address', 'selfie'] },
    documentUrl: { type: String },
    documentNumber: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: String,
    rejectionReason: String,
    verifiedAt: Date,
    verifiedBy: String
  }],
  kycStatus: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
  kycLevel: { type: Number, default: 0, enum: [0, 1, 2, 3] },

  // Security
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  twoFactorBackupCodes: [{ type: String, select: false }],
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },
  phoneVerificationCode: { type: String },
  phoneVerificationExpires: { type: Date },

  // Login Security
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  lastLoginIP: { type: String },
  lastLoginLocation: {
    city: String,
    country: String,
    lat: Number,
    lng: Number
  },

  // Password Reset
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // Referral System
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },
  referralTier: { type: Number, default: 1 },

  // Responsible Gambling
  responsibleGambling: {
    depositLimit: { type: Number, default: 10000 },
    lossLimit: { type: Number, default: 5000 },
    wagerLimit: { type: Number, default: 50000 },
    sessionTimeout: { type: Number, default: 120 },
    realityCheckInterval: { type: Number, default: 60 },
    selfExcluded: { type: Boolean, default: false },
    selfExclusionEndDate: { type: Date },
    coolingOffPeriodEnd: { type: Date },
    lastRealityCheck: { type: Date }
  },

  // Notification Preferences
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    betSettlements: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
    aiTips: { type: Boolean, default: true },
    systemUpdates: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true }
  },

  // Device Management
  devices: [{
    deviceId: { type: String, required: true },
    deviceName: { type: String },
    platform: { type: String, enum: ['web', 'ios', 'android', 'admin'] },
    browser: { type: String },
    os: { type: String },
    ipAddress: { type: String },
    location: { type: String },
    pushToken: { type: String },
    biometricEnabled: { type: Boolean, default: false },
    biometricPublicKey: { type: String },
    lastUsed: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],

  // Active Sessions
  sessions: [{
    sessionId: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceId: { type: String },
    loginAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    expiresAt: { type: Date }
  }],

  // Saved Payment Methods
  savedPaymentMethods: [{
    type: { type: String, enum: ['tele_birr', 'cbe', 'card', 'paypal', 'crypto', 'bank_transfer'] },
    identifier: { type: String },
    last4: { type: String },
    brand: { type: String },
    isDefault: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
    metadata: mongoose.Schema.Types.Mixed
  }],

  // Betting Preferences
  bettingPreferences: {
    defaultStake: { type: Number, default: 10 },
    autoCashoutMultiplier: { type: Number, default: 0 },
    favoriteLeagues: [{ type: String }],
    favoriteTeams: [{ type: String }],
    excludedMarkets: [{ type: String }]
  },

  // Affiliate/Partner Info
  affiliate: {
    partnerId: { type: String },
    commissionRate: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 },
    paidCommission: { type: Number, default: 0 }
  },

  // Account Notes (Admin only)
  notes: [{
    note: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],

  // Timestamps
  lastLogin: { type: Date },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================
// createdAt already gets a single-field index from `index: true` on its field
// definition above — duplicate standalone index removed from here.
userSchema.index({ lastActive: -1 });
userSchema.index({ 'wallet.balance': -1 });
userSchema.index({ 'vip.level': -1 });
userSchema.index({ 'vip.loyaltyPoints': -1 });
// referralCode already gets a unique index from `unique: true` on its field
// definition — duplicate standalone index removed from here.
userSchema.index({ referredBy: 1 });
userSchema.index({ 'devices.deviceId': 1 });
userSchema.index({ 'sessions.sessionId': 1 });
userSchema.index({ kycStatus: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
userSchema.pre('save', async function(next) {
  const user = this as any;
  if (!user.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(user.password, salt);

  if (!user.passwordHistory) {
    user.passwordHistory = [];
  }

  user.passwordHistory.unshift(hashedPassword);
  if (user.passwordHistory.length > 5) {
    user.passwordHistory = user.passwordHistory.slice(0, 5);
  }

  user.password = hashedPassword;
  next();
});

userSchema.pre('save', function(next) {
  const user = this as any;
  if (!user.referralCode && user.isNew) {
    user.referralCode = user.generateReferralCode();
  }
  user.updatedAt = new Date();
  next();
});

// ==================== INSTANCE METHODS ====================
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const user = this as any;
  return await bcrypt.compare(candidatePassword, user.password);
};

userSchema.methods.generateReferralCode = function(): string {
  const prefix = 'SHB';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

userSchema.methods.generateTwoFactorSecret = function(): any {
  const user = this as any;
  const secret = speakeasy.generateSecret({ length: 20, name: `SHEBAODDS (${user.email})` });
  user.twoFactorSecret = secret.base32;
  return secret;
};

userSchema.methods.verifyTwoFactorToken = function(token: string): boolean {
  const user = this as any;
  return speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: token,
    window: 2
  });
};

userSchema.methods.generateBackupCodes = function(): string[] {
  const user = this as any;
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
  }
  user.twoFactorBackupCodes = codes.map(code => bcrypt.hashSync(code, 10));
  return codes;
};

userSchema.methods.verifyBackupCode = async function(code: string): Promise<boolean> {
  const user = this as any;
  for (const hashedCode of user.twoFactorBackupCodes) {
    if (await bcrypt.compare(code, hashedCode)) {
      return true;
    }
  }
  return false;
};

userSchema.methods.generateEmailVerificationToken = function(): string {
  const user = this as any;
  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = token;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return token;
};

userSchema.methods.updateVipLevel = function(): void {
  const user = this as any;
  const totalWagered = user.wallet.totalWagered;
  let newLevel = 0;
  let newName = 'Bronze';
  let cashback = 0;

  if (totalWagered >= 1000000) { newLevel = 8; newName = 'Ambassador'; cashback = 25; }
  else if (totalWagered >= 500000) { newLevel = 7; newName = 'President'; cashback = 20; }
  else if (totalWagered >= 250000) { newLevel = 6; newName = 'Elite'; cashback = 15; }
  else if (totalWagered >= 100000) { newLevel = 5; newName = 'Diamond'; cashback = 10; }
  else if (totalWagered >= 50000) { newLevel = 4; newName = 'Platinum'; cashback = 7; }
  else if (totalWagered >= 20000) { newLevel = 3; newName = 'Gold'; cashback = 5; }
  else if (totalWagered >= 5000) { newLevel = 2; newName = 'Silver'; cashback = 3; }
  else { newLevel = 1; newName = 'Bronze'; cashback = 2; }

  user.vip.level = newLevel;
  user.vip.name = newName;
  user.vip.cashbackPercentage = cashback;
  user.vip.personalManager = newLevel >= 6;
  user.vip.higherLimits = newLevel >= 4;
  user.vip.exclusivePromotions = newLevel >= 3;
  user.vip.fasterWithdrawals = newLevel >= 5;
};

userSchema.methods.canPlaceBet = function(amount: number): boolean {
  const user = this as any;
  if (!user.isActive || user.isBlocked || user.isSuspended) return false;
  if (user.responsibleGambling.selfExcluded && user.responsibleGambling.selfExclusionEndDate > new Date()) return false;
  if (user.responsibleGambling.coolingOffPeriodEnd && user.responsibleGambling.coolingOffPeriodEnd > new Date()) return false;
  if (user.wallet.balance < amount) return false;
  return true;
};

userSchema.methods.getDepositLimit = function(): number {
  const user = this as any;
  let limit = user.responsibleGambling.depositLimit;
  if (user.vip.higherLimits) limit *= 2;
  if (user.vip.level >= 7) limit *= 5;
  return limit;
};

userSchema.methods.toJSON = function(): any {
  const user = this as any;
  const obj = user.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.twoFactorBackupCodes;
  delete obj.resetPasswordToken;
  delete obj.emailVerificationToken;
  delete obj.phoneVerificationCode;
  return obj;
};

// ==================== STATIC METHODS ====================
userSchema.statics.findByEmailOrUsername = function(identifier: string) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() }
    ]
  });
};

userSchema.statics.getTopWagered = function(limit = 100) {
  return this.find({ isActive: true })
    .sort({ 'wallet.totalWagered': -1 })
    .limit(limit)
    .select('username fullName wallet.totalWagered vip.level');
};

userSchema.statics.getOnlineUsers = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.countDocuments({ lastActive: { $gte: fiveMinutesAgo } });
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
export default User;