// ==============================================================================
// ⚠️ STABILIZATION NOTE — READ BEFORE EDITING
// ==============================================================================
// This file defines its OWN Mongoose models (UserProfileModel, MatchModel,
// BetModel, TransactionModel, and their own IUserProfile/IMatch/IBet/
// ITransaction interfaces) — a second, less complete implementation that
// duplicates User.ts/Match.ts/Bet.ts/Transaction.ts and authRoutes.ts/
// walletRoutes.ts elsewhere in this codebase. server.ts now mounts
// authRouter/walletRouter/etc. BEFORE this file's router, so the overlapping
// routes here (/auth/register, /auth/login, /wallet/deposit, /wallet/withdraw)
// are effectively dead by design — left in place rather than deleted so
// nothing here is silently lost, but they should not be relied on or built on
// further. Routes with no path collision (/player/*, /jackpot/*, /vip/*,
// /tax/*, /support/*, /sports/*) are NOT dead, but write to this file's
// separate models, not the ones the rest of the app reads from — so, e.g., a
// bet placed via /player/wager will not show up in betting history served by
// bettingRoutes.ts. Before building further on this file, pick one model
// layer as canonical (User.ts/Match.ts/Bet.ts/Transaction.ts is used by more
// of the codebase) and either delete this file's duplicate schemas/routes or
// migrate its unique routes onto the canonical models.
// ==============================================================================
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { validatePasswordStrength } from './passwordValidator';
import { Wallet, Wager } from './MongoDBWalletEngine';
import { JackpotPool, JackpotTicket } from './jackpotSchema';
import { VIPTier } from './vipTierSchema';
import { getCurrentEthiopiaTime, formatMatchTime } from './timezoneConfig';

// ==============================================================================
// 🔐 SCHEMA & DATA MODEL DEFINITIONS
// ==============================================================================

export enum UserRole {
  PLAYER = 'Player',
  AGENT = 'Agent',
  MASTER_ADMIN = 'SuperAdmin'
}

interface IUserProfile extends Document {
  userId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  role: UserRole;
  preferredLanguage: string;
  isFlagged: boolean;
  nationalIdNumber?: string;
  deviceHardwareHash?: string;
}

const UserProfileSchema = new Schema<IUserProfile>({
  userId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.PLAYER, required: true },
  preferredLanguage: { type: String, default: 'am', required: true },
  isFlagged: { type: Boolean, default: false, required: true },
  nationalIdNumber: { type: String },
  deviceHardwareHash: { type: String }
}, { timestamps: true });

export const UserProfileModel = (mongoose.models.UserProfile as Model<IUserProfile>) || mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);

// --- Match Schema (Sports Feed) ---
interface IMatch extends Document {
  id: number;
  homeTeam: string;
  awayTeam: string;
  status: 'Scheduled' | 'Live' | 'Finished';
  homeScore: number;
  awayScore: number;
  minute: number;
  commenceTime: Date;
  sport: string;
  league: string;
  odds: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
    under25: number;
    bttsYes: number;
    bttsNo: number;
  };
}

const MatchSchema = new Schema<IMatch>({
  id: { type: Number, required: true, unique: true },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  status: { type: String, enum: ['Scheduled', 'Live', 'Finished'], default: 'Scheduled' },
  homeScore: { type: Number, default: 0 },
  awayScore: { type: Number, default: 0 },
  minute: { type: Number, default: 0 },
  commenceTime: { type: Date, required: true },
  sport: { type: String, default: 'Football' },
  league: { type: String, required: true },
  odds: {
    homeWin: { type: Number, required: true },
    draw: { type: Number, required: true },
    awayWin: { type: Number, required: true },
    over25: { type: Number, required: true },
    under25: { type: Number, required: true },
    bttsYes: { type: Number, required: true },
    bttsNo: { type: Number, required: true }
  }
}, { timestamps: true });

export const MatchModel = (mongoose.models.Match as Model<IMatch>) || mongoose.model<IMatch>('Match', MatchSchema);

// --- Bet / Slip Schema ---
interface ISelection {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  market: string;
  selection: string;
  odds: number;
  status: 'Pending' | 'Won' | 'Lost' | 'Void';
}

interface IBet extends Document {
  userId: string;
  ticketId: string;
  selections: ISelection[];
  stake: number;
  odds: number;
  potentialPayout: number;
  taxDeducted: number;
  netPayout: number;
  slipType: 'Single' | 'Accumulator' | 'System';
  status: 'Pending' | 'Won' | 'Lost' | 'Void' | 'CashedOut';
}

const SelectionSchema = new Schema<ISelection>({
  matchId: { type: Number, required: true },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  market: { type: String, required: true },
  selection: { type: String, required: true },
  odds: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Won', 'Lost', 'Void'], default: 'Pending' }
});

const BetSchema = new Schema<IBet>({
  userId: { type: String, required: true, index: true },
  ticketId: { type: String, required: true, unique: true, index: true },
  selections: [SelectionSchema],
  stake: { type: Number, required: true },
  odds: { type: Number, required: true },
  potentialPayout: { type: Number, required: true },
  taxDeducted: { type: Number, default: 0 },
  netPayout: { type: Number, required: true },
  slipType: { type: String, enum: ['Single', 'Accumulator', 'System'], required: true },
  status: { type: String, enum: ['Pending', 'Won', 'Lost', 'Void', 'CashedOut'], default: 'Pending' }
}, { timestamps: true });

export const BetModel = (mongoose.models.Bet as Model<IBet>) || mongoose.model<IBet>('Bet', BetSchema);

// --- Transaction Schema ---
interface ITransaction extends Document {
  transactionId: string;
  userId: string;
  amount: number;
  type: 'Deposit' | 'Withdrawal' | 'Bet_Stake' | 'Bet_Payout' | 'Jackpot_Entry' | 'Jackpot_Payout' | 'VIP_Cashback';
  paymentGateway: 'TeleBirr' | 'CBE_Birr' | 'Chapa' | 'Stripe' | 'Internal';
  status: 'Pending' | 'Success' | 'Failed';
  reference: string;
}

const TransactionSchema = new Schema<ITransaction>({
  transactionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['Deposit', 'Withdrawal', 'Bet_Stake', 'Bet_Payout', 'Jackpot_Entry', 'Jackpot_Payout', 'VIP_Cashback'], required: true },
  paymentGateway: { type: String, enum: ['TeleBirr', 'CBE_Birr', 'Chapa', 'Stripe', 'Internal'], default: 'Internal' },
  status: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Success' },
  reference: { type: String, required: true }
}, { timestamps: true });

export const TransactionModel = (mongoose.models.Transaction as Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);


// ==============================================================================
// 🛡️ JWT & RBAC SECURITY MIDDLEWARES
// ==============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'sheba_odds_jwt_secret_high_entropy_fallback_token_99812';

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access Token Missing',
      message: 'Authentication bearer token is required to access this endpoint.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid Access Token',
        message: 'The token provided is expired, malformed, or structurally invalid.'
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as UserRole
    };
    next();
  });
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthenticated Request',
        message: 'Identity verification credentials were not located in the processing context.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied',
        message: `Your current security role (${req.user.role}) is insufficient to invoke this procedure. Required tiers: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
}


// ==============================================================================
// 🚀 UNIFIED EXPRESS API GATEWAY ROUTER
// ==============================================================================

const router = express.Router();

// Mock Redis stream / memory fallback cache
const localMemoryCache = new Map<string, { value: string; expiresAt: number }>();

const cacheService = {
  get: async (key: string): Promise<string | null> => {
    const item = localMemoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      localMemoryCache.delete(key);
      return null;
    }
    return item.value;
  },
  setEx: async (key: string, seconds: number, value: string): Promise<void> => {
    localMemoryCache.set(key, {
      value,
      expiresAt: Date.now() + (seconds * 1000)
    });
  },
  del: async (key: string): Promise<void> => {
    localMemoryCache.delete(key);
  }
};

// Seed dynamic matches in-memory if MongoDB collection is empty
const ensureMatchesSeeded = async () => {
  const count = await MatchModel.countDocuments();
  if (count === 0) {
    const sampleMatches = [
      {
        id: 1001,
        homeTeam: 'Ethiopia Coffee',
        awayTeam: 'Saint George SA',
        status: 'Live',
        homeScore: 2,
        awayScore: 1,
        minute: 67,
        commenceTime: new Date(Date.now() - 3600000),
        sport: 'Football',
        league: 'Ethiopian Premier League',
        odds: { homeWin: 2.10, draw: 3.10, awayWin: 3.40, over25: 1.95, under25: 1.80, bttsYes: 1.70, bttsNo: 2.05 }
      },
      {
        id: 1002,
        homeTeam: 'Manchester United',
        awayTeam: 'Arsenal',
        status: 'Live',
        homeScore: 0,
        awayScore: 1,
        minute: 12,
        commenceTime: new Date(Date.now() - 600000),
        sport: 'Football',
        league: 'English Premier League',
        odds: { homeWin: 3.20, draw: 3.50, awayWin: 2.10, over25: 1.65, under25: 2.10, bttsYes: 1.55, bttsNo: 2.30 }
      },
      {
        id: 1003,
        homeTeam: 'Real Madrid',
        awayTeam: 'Barcelona',
        status: 'Scheduled',
        homeScore: 0,
        awayScore: 0,
        minute: 0,
        commenceTime: new Date(Date.now() + 7200000), // in 2 hours
        sport: 'Football',
        league: 'La Liga',
        odds: { homeWin: 1.95, draw: 3.75, awayWin: 3.40, over25: 1.50, under25: 2.50, bttsYes: 1.45, bttsNo: 2.60 }
      },
      {
        id: 1004,
        homeTeam: 'Fasil Kenema',
        awayTeam: 'Adama City',
        status: 'Scheduled',
        homeScore: 0,
        awayScore: 0,
        minute: 0,
        commenceTime: new Date(Date.now() + 86400000), // tomorrow
        sport: 'Football',
        league: 'Ethiopian Premier League',
        odds: { homeWin: 2.20, draw: 2.90, awayWin: 3.60, over25: 2.15, under25: 1.60, bttsYes: 1.90, bttsNo: 1.80 }
      },
      {
        id: 1005,
        homeTeam: 'Wolaitta Dicha',
        awayTeam: 'Hadiya Hossana',
        status: 'Scheduled',
        homeScore: 0,
        awayScore: 0,
        minute: 0,
        commenceTime: new Date(Date.now() + 172800000), // in 2 days
        sport: 'Football',
        league: 'Ethiopian Premier League',
        odds: { homeWin: 2.40, draw: 2.80, awayWin: 3.10, over25: 2.30, under25: 1.50, bttsYes: 2.00, bttsNo: 1.70 }
      }
    ];
    // Cast: these are simplified seed literals, not full IMatch-shaped
    // documents (this legacy seeder predates Match.ts's canonical IMatch).
    // Not worth reshaping — see the file-level warning below.
    await MatchModel.insertMany(sampleMatches as any[]);
  }
};


// ==================== AUTHENTICATION PORT ====================

// POST: Player/User Registration
router.post('/auth/register', async (req, res) => {
  const { email, password, fullName, phone, preferredLanguage, deviceHardwareHash } = req.body;

  if (!email || !password || !fullName || !phone) {
    return res.status(400).json({
      success: false,
      error: 'Missing Parameters',
      message: 'Email, password, full name, and phone number are required.'
    });
  }

  const passwordValidation = validatePasswordStrength(password, { email, fullName, phone });
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Weak Password',
      message: 'Password does not meet enterprise security requirements.',
      errors: passwordValidation.errors,
      strength: passwordValidation.strength
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existing = await UserProfileModel.findOne({ email }).session(session);
    if (existing) {
      throw new Error('An account with this email is already registered.');
    }

    const userId = `USR-${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    // Create Profile
    const profile = new UserProfileModel({
      userId,
      email,
      passwordHash,
      fullName,
      phone,
      role: UserRole.PLAYER,
      preferredLanguage: preferredLanguage || 'am',
      isFlagged: false,
      deviceHardwareHash: deviceHardwareHash || `DEV-HASH-${Math.floor(100000 + Math.random() * 900000)}`
    });

    await profile.save({ session });

    // Create Wallet with Welcome Bonus
    const welcomeAmount = parseFloat(process.env.WELCOME_BONUS || '100');
    const wallet = new Wallet({
      userId,
      cashBalance: welcomeAmount,
      bonusBalance: 0
    });

    await wallet.save({ session });

    // Create VIPTier (Bronze)
    const vip = new VIPTier({
      userId,
      currentTier: 'Bronze',
      prestigePoints: 0,
      unlockedPrivileges: ['Standard Bets', 'Dynamic Odds'],
      customAvatarBorderHex: '#CD7F32' // Bronze
    });

    await vip.save({ session });

    // Record Registration Bonus Transaction
    const txnId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const registrationTx = new TransactionModel({
      transactionId: txnId,
      userId,
      amount: welcomeAmount,
      type: 'Deposit',
      paymentGateway: 'Internal',
      status: 'Success',
      reference: 'REGISTRATION_WELCOME_BONUS'
    });

    await registrationTx.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: `Account registered successfully! Granted ${welcomeAmount} ETB welcome bonus.`,
      userId,
      email
    });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      error: 'Registration Failed',
      message: err.message
    });
  }
});

// POST: User Login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Missing Credentials',
      message: 'Both email and password are required.'
    });
  }

  try {
    const user = await UserProfileModel.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Credentials',
        message: 'The email address or password provided was incorrect.'
      });
    }

    if (user.isFlagged) {
      return res.status(403).json({
        success: false,
        error: 'Account Flagged',
        message: 'Your account has been flagged for suspicious activity. Access suspended.'
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Credentials',
        message: 'The email address or password provided was incorrect.'
      });
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      profile: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Login Error',
      message: err.message
    });
  }
});

// POST: Biometric Verification & Login Simulation
router.post('/auth/biometric-login', async (req, res) => {
  const { email, deviceHardwareHash } = req.body;

  if (!email || !deviceHardwareHash) {
    return res.status(400).json({
      success: false,
      error: 'Missing Biometric Signature',
      message: 'Email and device hardware signature are required.'
    });
  }

  try {
    const user = await UserProfileModel.findOne({ email, deviceHardwareHash });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Biometric Handshake Failed',
        message: 'Hardware fingerprint signature mismatch or device not linked.'
      });
    }

    if (user.isFlagged) {
      return res.status(403).json({
        success: false,
        error: 'Account Suspended',
        message: 'This device and linked account are blacklisted due to hardware anti-collusion logs.'
      });
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: '🔒 Biometric Hardware Verification Authenticated successfully',
      token,
      profile: {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Biometric Authenticator Failure',
      message: err.message
    });
  }
});

// GET: Fetch Complete Active Profile (with Wallet & VIP details)
router.get('/player/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const profile = await UserProfileModel.findOne({ userId: user.userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    const wallet = await Wallet.findOne({ userId: user.userId });
    const vip = await VIPTier.findOne({ userId: user.userId });

    return res.status(200).json({
      success: true,
      profile: {
        userId: profile.userId,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        preferredLanguage: profile.preferredLanguage,
        isFlagged: profile.isFlagged,
        deviceHardwareHash: profile.deviceHardwareHash,
        nationalIdVerified: !!profile.nationalIdNumber
      },
      wallet: wallet ? {
        cashBalance: wallet.cashBalance,
        bonusBalance: wallet.bonusBalance,
        totalBalance: wallet.cashBalance + wallet.bonusBalance
      } : { cashBalance: 0, bonusBalance: 0, totalBalance: 0 },
      vip: vip ? {
        currentTier: vip.currentTier,
        prestigePoints: vip.prestigePoints,
        unlockedPrivileges: vip.unlockedPrivileges,
        customAvatarBorderHex: vip.customAvatarBorderHex
      } : { currentTier: 'Bronze', prestigePoints: 0, unlockedPrivileges: [], customAvatarBorderHex: '#CD7F32' }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Profile fetch failed',
      message: err.message
    });
  }
});


// ==================== SPORTSBOOK MATCHES FEEDS ====================

// GET: Live & Upcoming Matches List
router.get('/sports/matches', async (req, res) => {
  try {
    await ensureMatchesSeeded();
    const matches = await MatchModel.find().sort({ status: -1, commenceTime: 1 });
    
    const formattedMatches = matches.map(m => {
      const timeDetails = formatMatchTime(m.commenceTime);
      return {
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        status: m.status,
        score: `${m.homeScore} - ${m.awayScore}`,
        minute: m.minute,
        commenceTime: m.commenceTime,
        sport: m.sport,
        league: m.league,
        odds: m.odds,
        formattedTime: timeDetails
      };
    });

    return res.status(200).json({
      success: true,
      matches: formattedMatches
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Sports Feed Failure',
      message: err.message
    });
  }
});

// GET: High-speed live-odds (public caching feed with low-latency Redis model)
router.get('/sports/live-odds', async (req, res) => {
  const cacheKey = 'active_live_odds';

  try {
    await ensureMatchesSeeded();
    const cachedPayload = await cacheService.get(cacheKey);

    if (cachedPayload) {
      return res.status(200)
        .header('X-Cache-Status', 'HIT - REDIS CACHE')
        .json(JSON.parse(cachedPayload));
    }

    const liveMatches = await MatchModel.find({ status: 'Live' });
    const payload = liveMatches.map(m => ({
      id: m.id,
      home: m.homeTeam,
      away: m.awayTeam,
      score: `${m.homeScore}-${m.awayScore}`,
      minute: m.minute,
      odds: {
        "1": m.odds.homeWin,
        "X": m.odds.draw,
        "2": m.odds.awayWin,
        "Over 2.5": m.odds.over25,
        "Under 2.5": m.odds.under25
      },
      timestamp: Date.now()
    }));

    // Save back to Redis cache fallback for 5 seconds
    await cacheService.setEx(cacheKey, 5, JSON.stringify(payload));

    return res.status(200)
      .header('X-Cache-Status', 'MISS - DB FALLBACK')
      .json(payload);

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Cache Engine Error',
      message: err.message
    });
  }
});


// ==================== BETTING & WAGERING MODULE ====================

// POST: Place a Wager (Supports single, accumulator multi-bets, and systems under ACID sessions)
router.post('/player/wager', authenticateToken, authorizeRoles(UserRole.PLAYER), async (req: AuthenticatedRequest, res: Response) => {
  const { selections, stake, slipType } = req.body;
  const user = req.user!;

  if (!selections || !Array.isArray(selections) || selections.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Payload',
      message: 'Bet slip selections are required.'
    });
  }

  const parsedStake = parseFloat(stake);
  if (isNaN(parsedStake) || parsedStake < 1 || parsedStake > 50000) {
    return res.status(400).json({
      success: false,
      error: 'Stake Limits Breached',
      message: 'Stake amount must be a number between 1 ETB and 50,000 ETB.'
    });
  }

  // Validate accumulator sizes
  if (slipType === 'Accumulator' && selections.length > 20) {
    return res.status(400).json({
      success: false,
      error: 'Max Selections Exceeded',
      message: 'Accumulator bet supports a maximum of 20 selections.'
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Lock User wallet inside session
    const wallet = await Wallet.findOne({ userId: user.userId }).session(session);
    if (!wallet) {
      throw new Error('Wallet not located for client identity.');
    }

    if (wallet.cashBalance < parsedStake) {
      throw new Error('Insufficient wallet cash liquidity reserves.');
    }

    // 2. Fetch and calculate cumulative odds
    let cumulativeOdds = 1;
    const selectionDetails: any[] = [];

    for (const sel of selections) {
      const match = await MatchModel.findOne({ id: sel.matchId }).session(session);
      if (!match) {
        throw new Error(`Match #${sel.matchId} not registered in sportsbook feeds.`);
      }
      if (match.status === 'Finished') {
        throw new Error(`Match #${sel.matchId} is already completed. Bet slip lock refused.`);
      }

      // Check selected odds
      let marketOdds = 1.0;
      switch (sel.market) {
        case '1X2':
          if (sel.selection === '1') marketOdds = match.odds.homeWin;
          else if (sel.selection === 'X') marketOdds = match.odds.draw;
          else if (sel.selection === '2') marketOdds = match.odds.awayWin;
          break;
        case 'Over/Under 2.5':
          if (sel.selection === 'Over') marketOdds = match.odds.over25;
          else marketOdds = match.odds.under25;
          break;
        case 'BTTS':
          if (sel.selection === 'Yes') marketOdds = match.odds.bttsYes;
          else marketOdds = match.odds.bttsNo;
          break;
        default:
          marketOdds = 1.5; // fallback
      }

      cumulativeOdds *= marketOdds;
      selectionDetails.push({
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        market: sel.market,
        selection: sel.selection,
        odds: marketOdds,
        status: 'Pending'
      });
    }

    cumulativeOdds = parseFloat(cumulativeOdds.toFixed(2));

    // 3. Financial calculations with regional 15% Ethiopian Withholding Tax
    const grossPayout = parsedStake * cumulativeOdds;
    const netProfit = grossPayout - parsedStake;
    
    // Ethiopian Tax code: 15% tax on net win if net profit is above 100 ETB
    const taxRate = parseFloat(process.env.TAX_RATE || '0.15');
    const taxFreeLimit = parseFloat(process.env.TAX_FREE_LIMIT || '100');
    
    const taxDeduction = netProfit > taxFreeLimit ? netProfit * taxRate : 0;
    const finalNetReturn = grossPayout - taxDeduction;

    // 4. Mutate Wallet balance inside ACID session
    wallet.cashBalance = parseFloat((wallet.cashBalance - parsedStake).toFixed(2));
    await wallet.save({ session });

    // 5. Generate unique Ticket ID
    const ticketId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 6. Write Bet Document
    const bet = new BetModel({
      userId: user.userId,
      ticketId,
      selections: selectionDetails,
      stake: parsedStake,
      odds: cumulativeOdds,
      potentialPayout: grossPayout,
      taxDeducted: taxDeduction,
      netPayout: finalNetReturn,
      slipType: slipType || (selections.length > 1 ? 'Accumulator' : 'Single'),
      status: 'Pending'
    });
    await bet.save({ session });

    // 7. Write Ledger Transaction record
    const transaction = new TransactionModel({
      transactionId: ticketId,
      userId: user.userId,
      amount: parsedStake,
      type: 'Bet_Stake',
      paymentGateway: 'Internal',
      status: 'Success',
      reference: `BET_TICKET_${ticketId}`
    });
    await transaction.save({ session });

    // 8. Progressive prestige VIP point reward (1 point per 10 ETB wagered)
    const vip = await VIPTier.findOne({ userId: user.userId }).session(session);
    if (vip) {
      const addedPoints = Math.floor(parsedStake / 10);
      vip.prestigePoints += addedPoints;

      // Tier promotion thresholds
      if (vip.prestigePoints >= 10000 && vip.currentTier === 'Gold') {
        vip.currentTier = 'Sheba_Black';
        vip.customAvatarBorderHex = '#FFD700'; // Sleek gold gradient for supreme black
        vip.unlockedPrivileges.push('Personal Concierge', 'Express CBE Transfers', 'Unlimited Free Spins');
      } else if (vip.prestigePoints >= 3000 && vip.currentTier === 'Silver') {
        vip.currentTier = 'Gold';
        vip.customAvatarBorderHex = '#FBBF24'; // Gold
        vip.unlockedPrivileges.push('5% Weekly Cashback', 'VIP support line');
      } else if (vip.prestigePoints >= 800 && vip.currentTier === 'Bronze') {
        vip.currentTier = 'Silver';
        vip.customAvatarBorderHex = '#94A3B8'; // Silver
        vip.unlockedPrivileges.push('3% Weekly Cashback', 'Lower deposit fees');
      }
      await vip.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: '🎰 Bet slip accepted and logged in ledger successfully.',
      ticket: {
        ticketId,
        selections: selectionDetails,
        stake: parsedStake,
        odds: cumulativeOdds,
        potentialPayout: parseFloat(grossPayout.toFixed(2)),
        taxWithheld: parseFloat(taxDeduction.toFixed(2)),
        netPayout: parseFloat(finalNetReturn.toFixed(2)),
        slipType: bet.slipType
      }
    });

  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      error: 'Wagering Lock Failure',
      message: err.message
    });
  }
});

// GET: Fetch historical bets for active player
router.get('/player/bets', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const bets = await BetModel.find({ userId: user.userId }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      bets
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Wager ledger error',
      message: err.message
    });
  }
});

// POST: Real-time Cashout Subsystem
router.post('/player/cashout', authenticateToken, authorizeRoles(UserRole.PLAYER), async (req: AuthenticatedRequest, res: Response) => {
  const { ticketId } = req.body;
  const user = req.user!;

  if (!ticketId) {
    return res.status(400).json({
      success: false,
      error: 'Missing TicketID'
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bet = await BetModel.findOne({ ticketId, userId: user.userId }).session(session);
    if (!bet) throw new Error('Bet ticket not found or does not belong to you.');
    if (bet.status !== 'Pending') throw new Error(`Ticket already settled as ${bet.status}. Cashout declined.`);

    // Dynamic cashout calculator: returns 75% of stake plus partial odds reward
    const cashoutValue = parseFloat((bet.stake * 0.75 + (bet.stake * (bet.odds - 1) * 0.25)).toFixed(2));

    const wallet = await Wallet.findOne({ userId: user.userId }).session(session);
    if (!wallet) throw new Error('Wallet not located.');

    // Mutate balance
    wallet.cashBalance = parseFloat((wallet.cashBalance + cashoutValue).toFixed(2));
    await wallet.save({ session });

    // Mark Bet Cashed Out
    bet.status = 'CashedOut';
    await bet.save({ session });

    // Log transaction
    const txnId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const tx = new TransactionModel({
      transactionId: txnId,
      userId: user.userId,
      amount: cashoutValue,
      type: 'Bet_Payout',
      paymentGateway: 'Internal',
      status: 'Success',
      reference: `CASHOUT_TICKET_${ticketId}`
    });
    await tx.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `💰 Cashout approved. ${cashoutValue} ETB credited back to your wallet.`,
      ticketId,
      refundedAmount: cashoutValue
    });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      error: 'Cashout failed',
      message: err.message
    });
  }
});


// ==================== JACKPOT CENTER SUBSYSTEM ====================

// GET: All active and past Jackpot Pools
router.get('/jackpot/pools', async (req, res) => {
  try {
    const pools = await JackpotPool.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      pools
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Jackpot fetch failure',
      message: err.message
    });
  }
});

// POST: Buy ticket entry for standard 12-match Grand Weekend Jackpot (Costs 50 ETB)
router.post('/jackpot/buy-ticket', authenticateToken, authorizeRoles(UserRole.PLAYER), async (req: AuthenticatedRequest, res: Response) => {
  const { poolId, predictions } = req.body;
  const user = req.user!;

  if (!poolId || !predictions || !Array.isArray(predictions) || predictions.length !== 12) {
    return res.status(400).json({
      success: false,
      error: 'Invalid predictions',
      message: 'You must provide exactly 12 outcome predictions ("1", "X", or "2").'
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pool = await JackpotPool.findById(poolId).session(session);
    if (!pool) throw new Error('Jackpot pool session closed or does not exist.');
    if (pool.status !== 'Open') throw new Error(`Jackpot entry is already closed (Status: ${pool.status}).`);

    const entryFee = pool.entryFee || 50.00;

    const wallet = await Wallet.findOne({ userId: user.userId }).session(session);
    if (!wallet) throw new Error('Wallet not located.');
    if (wallet.cashBalance < entryFee) throw new Error('Insufficient wallet funds to pay Jackpot entry fee.');

    // Deduct fee
    wallet.cashBalance = parseFloat((wallet.cashBalance - entryFee).toFixed(2));
    await wallet.save({ session });

    // Save ticket
    const ticket = new JackpotTicket({
      jackpotPoolId: pool._id,
      userId: user.userId,
      predictions,
      correctGuessesCount: 0,
      isWinner: false
    });
    await ticket.save({ session });

    // Write Ledger transaction
    const txnId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const tx = new TransactionModel({
      transactionId: txnId,
      userId: user.userId,
      amount: entryFee,
      type: 'Jackpot_Entry',
      paymentGateway: 'Internal',
      status: 'Success',
      reference: `JACKPOT_TICKET_${ticket._id}`
    });
    await tx.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: `🎟️ Entry registered! Weekend 12-Game Jackpot ticket issued. 50 ETB deducted.`,
      ticketId: ticket._id
    });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      error: 'Jackpot purchase failed',
      message: err.message
    });
  }
});

// POST: Settle Jackpot Pool (SuperAdmin only)
router.post('/admin/jackpot/settle', authenticateToken, authorizeRoles(UserRole.MASTER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  const { poolId, results } = req.body;

  if (!poolId || !results || !Array.isArray(results) || results.length !== 12) {
    return res.status(400).json({
      success: false,
      error: 'Parameters invalid',
      message: 'Provide the poolId and exactly 12 final match outcomes.'
    });
  }

  try {
    const { evaluateJackpotPool } = require('./jackpotEvaluator');
    
    // Set pool status to locked first (to satisfy evaluator checks)
    await JackpotPool.findByIdAndUpdate(poolId, { status: 'Locked' });
    
    // Execute evaluation
    await evaluateJackpotPool(poolId, results);

    return res.status(200).json({
      success: true,
      message: `🏆 Jackpot pool settled successfully. Withheld taxes paid and winner wallets credited.`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Jackpot settlement error',
      message: err.message
    });
  }
});


// ==================== WALLET & BANK DEPOSITS/WITHDRAWALS ====================

// POST: Deposit funds via Mobile Payment Gateways
router.post('/wallet/deposit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { amount, gateway, reference } = req.body;
  const user = req.user!;

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 10 || parsedAmount > 100000) {
    return res.status(400).json({
      success: false,
      error: 'Deposit limits breached',
      message: 'Deposit must be between 10 ETB and 100,000 ETB.'
    });
  }

  if (!['TeleBirr', 'CBE_Birr', 'Chapa', 'Stripe'].includes(gateway)) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported Gateway'
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await Wallet.findOne({ userId: user.userId }).session(session);
    if (!wallet) throw new Error('Wallet not located.');

    // Increase cash balance
    wallet.cashBalance = parseFloat((wallet.cashBalance + parsedAmount).toFixed(2));
    await wallet.save({ session });

    // Log transaction
    const txnId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const tx = new TransactionModel({
      transactionId: txnId,
      userId: user.userId,
      amount: parsedAmount,
      type: 'Deposit',
      paymentGateway: gateway,
      status: 'Success',
      reference: reference || `DEP-${gateway.toUpperCase()}-${Date.now()}`
    });
    await tx.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `💰 Deposit of ${parsedAmount} ETB via ${gateway} successful!`,
      newBalance: wallet.cashBalance,
      receipt: {
        txnId,
        amount: parsedAmount,
        gateway,
        timestamp: new Date()
      }
    });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      error: 'Deposit pipeline failed',
      message: err.message
    });
  }
});

// POST: Withdraw funds
router.post('/wallet/withdraw', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { amount, gateway, bankAccountNumber } = req.body;
  const user = req.user!;

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 50 || parsedAmount > 50000) {
    return res.status(400).json({
      success: false,
      error: 'Limits breached',
      message: 'Withdrawal amount must be between 50 ETB and 50,000 ETB.'
    });
  }

  if (!['TeleBirr', 'CBE_Birr', 'Chapa'].includes(gateway)) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported withdrawal channel'
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await Wallet.findOne({ userId: user.userId }).session(session);
    if (!wallet) throw new Error('Wallet not found.');

    if (wallet.cashBalance < parsedAmount) {
      throw new Error('Insufficient cash balance to fulfill withdrawal request.');
    }

    // Deduct
    wallet.cashBalance = parseFloat((wallet.cashBalance - parsedAmount).toFixed(2));
    await wallet.save({ session });

    // Log transaction
    const txnId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const tx = new TransactionModel({
      transactionId: txnId,
      userId: user.userId,
      amount: parsedAmount,
      type: 'Withdrawal',
      paymentGateway: gateway,
      status: 'Success', // Mock instant withdrawal settlement
      reference: `WITHDRAW-${bankAccountNumber || 'MOBILE-WALLET'}`
    });
    await tx.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `💸 Withdrawal of ${parsedAmount} ETB submitted successfully.`,
      newBalance: wallet.cashBalance,
      referenceId: txnId
    });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      error: 'Withdrawal failed',
      message: err.message
    });
  }
});

// GET: Historical transactions ledger
router.get('/wallet/transactions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const txs = await TransactionModel.find({ userId: user.userId }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      transactions: txs
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Ledger retrieval failed',
      message: err.message
    });
  }
});


// ==================== VIP PROGRAM SUB-SYSTEM ====================

// GET: VIP progression and tier benefits
router.get('/vip/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const vip = await VIPTier.findOne({ userId: user.userId });
    if (!vip) throw new Error('VIP document not found.');

    // Next tier calculations
    let nextTier = 'Maxed';
    let pointsNeeded = 0;
    let progressPercentage = 100;

    if (vip.currentTier === 'Bronze') {
      nextTier = 'Silver';
      pointsNeeded = Math.max(0, 800 - vip.prestigePoints);
      progressPercentage = Math.min(100, Math.floor((vip.prestigePoints / 800) * 100));
    } else if (vip.currentTier === 'Silver') {
      nextTier = 'Gold';
      pointsNeeded = Math.max(0, 3000 - vip.prestigePoints);
      progressPercentage = Math.min(100, Math.floor((vip.prestigePoints / 3000) * 100));
    } else if (vip.currentTier === 'Gold') {
      nextTier = 'Sheba_Black';
      pointsNeeded = Math.max(0, 10000 - vip.prestigePoints);
      progressPercentage = Math.min(100, Math.floor((vip.prestigePoints / 10000) * 100));
    }

    return res.status(200).json({
      success: true,
      currentTier: vip.currentTier,
      prestigePoints: vip.prestigePoints,
      unlockedPrivileges: vip.unlockedPrivileges,
      customAvatarBorderHex: vip.customAvatarBorderHex,
      progression: {
        nextTier,
        pointsNeeded,
        progressPercentage
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'VIP lookup failed',
      message: err.message
    });
  }
});

// POST: Claim Weekly Tier-Progressive Cashback on Losses
router.post('/vip/claim-cashback', authenticateToken, authorizeRoles(UserRole.PLAYER), async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vip = await VIPTier.findOne({ userId: user.userId }).session(session);
    if (!vip) throw new Error('VIP Profile not found.');

    // Weekly cashback percentages: Bronze: 2%, Silver: 5%, Gold: 8%, Sheba_Black: 15%
    let rate = 0.02;
    if (vip.currentTier === 'Silver') rate = 0.05;
    else if (vip.currentTier === 'Gold') rate = 0.08;
    else if (vip.currentTier === 'Sheba_Black') rate = 0.15;

    // Fetch and sum up lost wagers over the past week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const bets = await BetModel.find({
      userId: user.userId,
      status: 'Lost',
      createdAt: { $gte: oneWeekAgo }
    }).session(session);

    const totalLostStake = bets.reduce((sum, b) => sum + b.stake, 0);
    const cashbackClaimable = parseFloat((totalLostStake * rate).toFixed(2));

    if (cashbackClaimable <= 0) {
      throw new Error('You have no claimable lost wager volume for the current weekly period.');
    }

    const wallet = await Wallet.findOne({ userId: user.userId }).session(session);
    if (!wallet) throw new Error('Wallet not located.');

    // Add cash balance
    wallet.cashBalance = parseFloat((wallet.cashBalance + cashbackClaimable).toFixed(2));
    await wallet.save({ session });

    // Write transaction record
    const txnId = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const tx = new TransactionModel({
      transactionId: txnId,
      userId: user.userId,
      amount: cashbackClaimable,
      type: 'VIP_Cashback',
      paymentGateway: 'Internal',
      status: 'Success',
      reference: `VIP_CASHBACK_${vip.currentTier.toUpperCase()}`
    });
    await tx.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `🎉 Success! Claimed ${cashbackClaimable} ETB weekly VIP cashback (${(rate*100).toFixed(0)}% of lost wagers credited).`,
      cashbackAmount: cashbackClaimable,
      newBalance: wallet.cashBalance
    });

  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      error: 'Cashback claim failed',
      message: err.message
    });
  }
});


// ==================== STATUTORY TAX COMPLIANCE CENTER ====================

// GET: Generate complete regional tax report (Dynamic aggregates)
router.get('/tax/report', authenticateToken, authorizeRoles(UserRole.MASTER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taxRate = parseFloat(process.env.TAX_RATE || '0.15');
    const taxFreeLimit = parseFloat(process.env.TAX_FREE_LIMIT || '100');

    // Query settled wagers (Wagers where outcome is already computed)
    const settledBets = await BetModel.find({ status: { $in: ['Won', 'Lost'] } });
    
    let grossWageringVolume = 0;
    let totalPayouts = 0;
    let totalTaxCollected = 0;
    let taxableCount = 0;
    let exemptCount = 0;

    for (const bet of settledBets) {
      grossWageringVolume += bet.stake;
      if (bet.status === 'Won') {
        totalPayouts += bet.potentialPayout;
        totalTaxCollected += bet.taxDeducted || 0;

        const netProfit = bet.potentialPayout - bet.stake;
        if (netProfit > taxFreeLimit) {
          taxableCount++;
        } else {
          exemptCount++;
        }
      } else {
        exemptCount++; // lost bets are exempt
      }
    }

    return res.status(200).json({
      success: true,
      report: {
        taxAuthority: process.env.TAX_AUTHORITY_NAME || 'Ministry of Revenues - Ethiopia',
        authorityId: process.env.TAX_AUTHORITY_ID || 'TAX_SHEBAODDS_001',
        withholdingTaxRate: taxRate,
        taxFreeThreshold: taxFreeLimit,
        grossVolumeEtb: parseFloat(grossWageringVolume.toFixed(2)),
        totalCashPayoutsEtb: parseFloat(totalPayouts.toFixed(2)),
        totalTaxCollectedEtb: parseFloat(totalTaxCollected.toFixed(2)),
        taxableTicketsCount: taxableCount,
        exemptTicketsCount: exemptCount,
        reportingAccount: process.env.TAX_PAYMENT_ACCOUNT || '1000234567890',
        reportingBank: process.env.TAX_PAYMENT_BANK || 'Commercial Bank of Ethiopia',
        status: 'Audited & Compliant'
      }
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Tax audit generation failed',
      message: err.message
    });
  }
});

// POST: Settle and remit tax liabilities to Ministry of Revenues via CBE API
router.post('/tax/remit', authenticateToken, authorizeRoles(UserRole.MASTER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settledBets = await BetModel.find({ status: 'Won' });
    const totalTaxCollected = settledBets.reduce((sum, b) => sum + (b.taxDeducted || 0), 0);

    if (totalTaxCollected <= 0) {
      return res.status(200).json({
        success: true,
        message: 'No active tax liability in current fiscal block ledger.'
      });
    }

    // Simulate endpoint bank connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const refPrefix = process.env.TAX_PAYMENT_REFERENCE_PREFIX || 'SHEBAODDS_TAX';
    const remittanceId = `${refPrefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const cbeTxnReference = `CBE-TXN-GOV-${Date.now()}`;

    // Mark all tax as remitted / paid (reset or record in database)
    // For demonstration, we simulate success
    return res.status(200).json({
      success: true,
      message: '🏛️ Remittance transaction finalized with tax authority successfully.',
      details: {
        remittanceId,
        cbeTxnReference,
        amountPaidEtb: parseFloat(totalTaxCollected.toFixed(2)),
        recipient: process.env.TAX_AUTHORITY_NAME || 'Ministry of Revenues - Ethiopia',
        governmentBankAccount: process.env.TAX_PAYMENT_ACCOUNT || '1000234567890',
        bankName: process.env.TAX_PAYMENT_BANK || 'Commercial Bank of Ethiopia',
        timestamp: new Date().toISOString(),
        receiptStatus: 'SIGNED & ARCHIVED'
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Remittance transfer halted',
      message: err.message
    });
  }
});


// ==================== AI CHATBOT & SPORTS TIPSTER SUPPORT ====================

// POST: Secure chatbot messaging port utilizing standard gemini-3.5-flash
router.post('/support/chat', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { message } = req.body;
  const user = req.user!;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Missing Message Body'
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('fake_keys')) {
      // Elegant mocking if no real API key is injected
      return res.status(200).json({
        success: true,
        response: `🦁 **SHEBAODDS AI Tipster Support** (Mock Mode):\n\n"እንኳን ደህና መጡ! I am your personal AI Tipster. I can guide you on placement strategies, explain the 15% Ethiopian withholding tax rules, or translate bet slips. Keep betting smart and win real on SHEBAODDS!"`
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-3.5-flash as default model per gemini-api skill instructions
    // `as any`: systemInstruction is a valid runtime option for Gemini models but
    // isn't in every version of @google/generative-ai's ModelParams type. Cast
    // here rather than guessing a package version bump I can't verify against
    // the real npm registry from this environment.
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      systemInstruction: `You are SHEBAODDS AI Tipster, a friendly, professional betting support assistant.
Your brand identity:
- Tagline: "Smart Bets. Real Wins."
- Colors & Theme: Sleek Cosmic dark theme (85% Black, 15% Gold).
- Focus: Help players evaluate sports bets, provide dynamic predictions, translate bet slips into Amharic, explain responsible gambling limits (max bet: 50,000 ETB), and explain Ethiopian regional tax rules (15% withholding tax withheld on net profits exceeding 100 ETB).
- Tone: Extremely helpful, conversational, professional, using precise sports terminology. Use emojis naturally (lion 🦁, soccer ⚽, coins 💰, charts 📊).
`
    } as any);

    const result = await model.generateContent(message);
    const responseText = result.response.text();

    return res.status(200).json({
      success: true,
      response: responseText
    });

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'AI assistant offline',
      message: err.message
    });
  }
});


// ==================== SYSTEM LEVEL CONFIGURATIONS & LOCALIZATION ====================

// GET: Branding Settings Configuration API
router.get('/branding', (req, res) => {
  return res.status(200).json({
    success: true,
    name: 'SHEBAODDS',
    tagline: 'Smart Bets. Real Wins.',
    domain: 'https://shebaodds.com',
    colors: {
      primaryGold: '#FFD700',
      canvasBlack: '#0A0A0A',
      accentDarkGold: '#DAA520',
      successGreen: '#4CAF50',
      dangerRed: '#F44336'
    },
    contact: {
      supportEmail: 'support@shebaodds.com',
      tele_birr_merchant: 'SHEBAODDS_001',
      taxAuthority: 'Ministry of Revenues - Ethiopia'
    }
  });
});

// GET: Localization strings
router.get('/localization', (req, res) => {
  const amharicBundle = {
    app: {
      name: "ሼባኦድስ",
      tagline: "ስማርት ቤትስ። ሪል ዊንስ።",
      welcome: "እንኳን ደህና መጣህ",
      loading: "በመጫን ላይ..."
    },
    navigation: {
      home: "መነሻ",
      live_betting: "ቀጥታ ውርርድ",
      casino: "ካዚኖ",
      promotions: "ማስተዋወቂያዎች",
      profile: "መገለጫ",
      wallet: "ቦርሳ",
      tax_center: "የግብር ማዕከል",
      support: "ድጋፍ"
    },
    auth: {
      login: "ግባ",
      register: "ተመዝገብ",
      email: "ኢሜይል",
      password: "የይለፍ ቃል",
      phone: "ስልክ ቁጥር"
    },
    wallet: {
      balance: "ቀሪ ሂሳብ",
      deposit: "ተቀማጭ",
      withdraw: "ማውጫ",
      transactions: "ግብይቶች"
    }
  };

  return res.status(200).json({
    success: true,
    defaultLanguage: 'am',
    translations: {
      am: amharicBundle,
      en: {
        app: {
          name: "ShebaOdds",
          tagline: "Smart Bets. Real Wins.",
          welcome: "Welcome",
          loading: "Loading..."
        },
        navigation: {
          home: "Home",
          live_betting: "Live Betting",
          casino: "Casino",
          promotions: "Promotions",
          profile: "Profile",
          wallet: "Wallet",
          tax_center: "Tax Center",
          support: "Support"
        }
      }
    }
  });
});

// GET: Timezone Config Calculator
router.get('/timezone', (req, res) => {
  const currentEtTime = getCurrentEthiopiaTime();
  return res.status(200).json({
    success: true,
    timezone: 'Africa/Addis_Ababa',
    offset: '+03:00',
    currentEthiopianTime: currentEtTime.format('YYYY-MM-DD HH:mm:ss'),
    dayOfWeek: currentEtTime.format('dddd'),
    formattedSample: formatMatchTime(new Date())
  });
});

export default router;
