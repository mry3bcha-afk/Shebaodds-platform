// ============================================
// SHEBAODDS - AUTHENTICATION MIDDLEWARE
// JWT Token Verification & Role Checks
// Supports: Sportsbook & Casino Games
// ============================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from './User';
import { Transaction } from './Transaction';

const JWT_SECRET = process.env.JWT_SECRET || 'sheba_odds_jwt_secret_high_entropy_fallback_token_99812';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sheba_odds_jwt_refresh_secret_99812';

// Clean in-memory token blacklist to simulate Redis blacklisting cleanly
const blacklistedTokens = new Set<string>();

export const blacklistToken = (token: string): void => {
  blacklistedTokens.add(token);
};

// Generate Access Token
export const generateToken = (user: any): string => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      isAdmin: !!user.isAdmin,
      vipLevel: user.vip?.level || 0
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

// Generate Refresh Token
export const generateRefreshToken = (user: any): string => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

// Verify Access Token
export const authenticate = async (req: any, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
        code: 'NO_TOKEN'
      });
    }

    // Check if token is blacklisted (simulated redis check)
    if (blacklistedTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please login again.',
        code: 'TOKEN_REVOKED'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if account is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account has been blocked. Please contact support.',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // Check if account is suspended
    if (user.isSuspended && user.suspensionEndDate && new Date(user.suspensionEndDate) > new Date()) {
      return res.status(403).json({
        success: false,
        message: `Account suspended until ${new Date(user.suspensionEndDate).toLocaleDateString()}.`,
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Check self-exclusion
    if (user.responsibleGambling?.selfExcluded && user.responsibleGambling.selfExclusionEndDate && new Date(user.responsibleGambling.selfExclusionEndDate) > new Date()) {
      return res.status(403).json({
        success: false,
        message: `Self-exclusion active until ${new Date(user.responsibleGambling.selfExclusionEndDate).toLocaleDateString()}.`,
        code: 'SELF_EXCLUDED'
      });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    // Attach user to request
    req.user = user;
    req.token = token;

    return next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
        code: 'INVALID_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please refresh your session.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Admin Only Middleware
export const isAdmin = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  return next();
};

// Super Admin Only Middleware
export const isSuperAdmin = async (req: any, res: Response, next: NextFunction) => {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@shebaodds.com';
  if (!req.user || !req.user.isAdmin || req.user.email !== superAdminEmail) {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required',
      code: 'SUPER_ADMIN_REQUIRED'
    });
  }
  return next();
};

// VIP Only Middleware
export const isVIP = (minLevel = 1) => {
  return (req: any, res: Response, next: NextFunction) => {
    const vipLevel = req.user?.vip?.level || 0;
    if (vipLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: `VIP Level ${minLevel} required`,
        code: 'VIP_REQUIRED'
      });
    }
    return next();
  };
};

// Verify Email Middleware
export const isEmailVerified = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
      action: 'verify_email'
    });
  }
  return next();
};

// Verify Phone Middleware
export const isPhoneVerified = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.phoneVerified) {
    return res.status(403).json({
      success: false,
      message: 'Phone verification required',
      code: 'PHONE_NOT_VERIFIED',
      action: 'verify_phone'
    });
  }
  return next();
};

// KYC Verified Middleware
export const isKYCVerified = (requiredLevel = 1) => {
  return (req: any, res: Response, next: NextFunction) => {
    const kycLevel = req.user?.kycLevel || 0;
    if (kycLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `KYC Level ${requiredLevel} verification required for this action.`,
        code: 'KYC_REQUIRED'
      });
    }
    return next();
  };
};

// Check if user can withdraw
export const canWithdraw = async (req: any, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Check if user has pending withdrawals
  const pendingWithdrawals = await Transaction.countDocuments({
    userId: user._id,
    type: 'withdrawal',
    status: { $in: ['pending', 'processing'] }
  });

  if (pendingWithdrawals >= 3) {
    return res.status(403).json({
      success: false,
      message: 'Maximum 3 pending withdrawals allowed. Please wait for existing requests to be processed.',
      code: 'TOO_MANY_PENDING'
    });
  }

  return next();
};

// Check if user can place bet (Sportsbook)
export const canPlaceBet = async (req: any, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Check responsible gambling limits
  if (user.responsibleGambling?.selfExcluded) {
    return res.status(403).json({
      success: false,
      message: 'Your account is self-excluded from betting.',
      code: 'SELF_EXCLUDED'
    });
  }

  // Check cooling-off period
  if (user.responsibleGambling?.coolingOffPeriodEnd && new Date(user.responsibleGambling.coolingOffPeriodEnd) > new Date()) {
    return res.status(403).json({
      success: false,
      message: `Your account is in cooling-off period until ${new Date(user.responsibleGambling.coolingOffPeriodEnd).toLocaleDateString()}.`,
      code: 'COOLING_OFF'
    });
  }

  // Additional sportsbook-specific checks can go here

  return next();
};

// 🎰 NEW: Check if user can play casino games
export const canPlayCasino = async (req: any, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Self-exclusion check
  if (user.responsibleGambling?.selfExcluded) {
    return res.status(403).json({
      success: false,
      message: 'Your account is self-excluded from casino games.',
      code: 'SELF_EXCLUDED'
    });
  }

  // Cooling-off period check
  if (user.responsibleGambling?.coolingOffPeriodEnd && new Date(user.responsibleGambling.coolingOffPeriodEnd) > new Date()) {
    return res.status(403).json({
      success: false,
      message: `Your account is in cooling-off period until ${new Date(user.responsibleGambling.coolingOffPeriodEnd).toLocaleDateString()}.`,
      code: 'COOLING_OFF'
    });
  }

  // VIP level requirement (e.g., some games may require VIP level 1 or higher)
  const requiredVipLevel = parseInt(process.env.CASINO_MIN_VIP_LEVEL || '0', 10);
  if (user.vip?.level < requiredVipLevel) {
    return res.status(403).json({
      success: false,
      message: `Casino games require VIP Level ${requiredVipLevel} or higher.`,
      code: 'VIP_LEVEL_TOO_LOW'
    });
  }

  // KYC requirement – some games may require KYC Level 1 (basic)
  const requiredKycLevel = parseInt(process.env.CASINO_MIN_KYC_LEVEL || '1', 10);
  if ((user.kycLevel || 0) < requiredKycLevel) {
    return res.status(403).json({
      success: false,
      message: `Casino games require KYC Level ${requiredKycLevel} verification.`,
      code: 'KYC_REQUIRED'
    });
  }

  // Age verification (minimum age for casino play, typically 18)
  const minAge = parseInt(process.env.CASINO_MIN_AGE || '18', 10);
  if (user.dateOfBirth) {
    const age = Math.floor((new Date().getTime() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < minAge) {
      return res.status(403).json({
        success: false,
        message: `You must be at least ${minAge} years old to play casino games.`,
        code: 'UNDERAGE'
      });
    }
  } else {
    // If date of birth is not set, we may require it
    return res.status(403).json({
      success: false,
      message: 'Date of birth is required to verify age for casino games.',
      code: 'DOB_REQUIRED'
    });
  }

  return next();
};