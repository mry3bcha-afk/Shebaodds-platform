// ============================================
// SHEBAODDS - RESPONSIBLE GAMBLING MIDDLEWARE
// Deposit/Loss/Wager Limits & Reality Checks
// INCLUDES: 51+ CASINO GAME SUPPORT
// ============================================

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from './User';
import { Transaction, TRANSACTION_TYPES, TRANSACTION_STATUS } from './Transaction';
import Bet from './Bet';

// ==================== CORE LIMIT CHECKERS ====================

// Check deposit limit
export const checkDepositLimit = async (userId: any, amount: number) => {
  const user = await User.findById(userId);
  if (!user) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayDeposits = await Transaction.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId.toString()), 
        type: TRANSACTION_TYPES.DEPOSIT, 
        status: TRANSACTION_STATUS.COMPLETED, 
        createdAt: { $gte: todayStart } 
      } 
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const depositedToday = todayDeposits[0]?.total || 0;
  const limit = user.responsibleGambling?.depositLimit || parseInt(process.env.DEFAULT_DEPOSIT_LIMIT || '10000', 10) || 10000;

  return {
    allowed: depositedToday + amount <= limit,
    remaining: Math.max(0, limit - depositedToday),
    limit
  };
};

// Check loss limit (applies to both sports and casino bets)
export const checkLossLimit = async (userId: any, stake: number) => {
  const user = await User.findById(userId);
  if (!user) {
    return { allowed: false, remaining: 0, currentLoss: 0, limit: 0 };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Aggregation now includes all bets (both sports and casino)
  const todayLosses = await Bet.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId.toString()), 
        status: 'lost', 
        createdAt: { $gte: todayStart } 
      } 
    },
    { $group: { _id: null, total: { $sum: '$stake' } } }
  ]);

  const todayWins = await Bet.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId.toString()), 
        status: 'won', 
        createdAt: { $gte: todayStart } 
      } 
    },
    { $group: { _id: null, total: { $sum: '$actualWin' } } }
  ]);

  const netLoss = (todayLosses[0]?.total || 0) - (todayWins[0]?.total || 0);
  const limit = user.responsibleGambling?.lossLimit || parseInt(process.env.DEFAULT_LOSS_LIMIT || '5000', 10) || 5000;

  return {
    allowed: netLoss + stake <= limit,
    remaining: Math.max(0, limit - netLoss),
    currentLoss: netLoss,
    limit
  };
};

// Check wager limit (total amount staked per day)
export const checkWagerLimit = async (userId: any, stake: number) => {
  const user = await User.findById(userId);
  if (!user) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Aggregation now includes all bets (both sports and casino)
  const todayWagered = await Bet.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId.toString()), 
        createdAt: { $gte: todayStart } 
      } 
    },
    { $group: { _id: null, total: { $sum: '$stake' } } }
  ]);

  const wageredToday = todayWagered[0]?.total || 0;
  const limit = user.responsibleGambling?.wagerLimit || parseInt(process.env.DEFAULT_WAGER_LIMIT || '50000', 10) || 50000;

  return {
    allowed: wageredToday + stake <= limit,
    remaining: Math.max(0, limit - wageredToday),
    limit
  };
};

// Check session timeout
export const checkSessionTimeout = async (userId: any) => {
  const user = await User.findById(userId);
  if (!user) {
    return { allowed: false, minutesRemaining: 0, limit: 0 };
  }

  const limit = user.responsibleGambling?.sessionTimeout || parseInt(process.env.DEFAULT_SESSION_LIMIT || '120', 10) || 120;

  if (!user.lastActive) return { allowed: true, minutesRemaining: limit, limit };

  const minutesActive = Math.floor((new Date().getTime() - new Date(user.lastActive).getTime()) / 60000);

  return {
    allowed: minutesActive < limit,
    minutesRemaining: Math.max(0, limit - minutesActive),
    limit
  };
};

// ==================== REALITY CHECK MIDDLEWARE ====================

export const realityCheck = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const interval = user.responsibleGambling?.realityCheckInterval || parseInt(process.env.REALITY_CHECK_INTERVAL || '60', 10) || 60;

    const lastCheck = user.responsibleGambling?.lastRealityCheck || user.lastActive || new Date();
    const minutesSinceCheck = Math.floor((new Date().getTime() - new Date(lastCheck).getTime()) / 60000);

    if (minutesSinceCheck >= interval) {
      user.responsibleGambling = user.responsibleGambling || {};
      user.responsibleGambling.lastRealityCheck = new Date();
      await user.save();

      // Send reality check notification
      return res.status(200).json({
        success: true,
        realityCheck: true,
        message: process.env.REALITY_CHECK_MESSAGE?.replace('{minutes}', minutesSinceCheck.toString()) || 
          `You have been playing for ${minutesSinceCheck} minutes. Please play responsibly.`,
        options: ['continue', 'take_break', 'set_limit', 'self_exclude']
      });
    }

    return next();
  } catch (error: any) {
    return next(error);
  }
};

// ==================== COMBINED RESPONSIBLE GAMBLING CHECK (Sports + Casino) ====================

export const checkResponsibleGambling = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Determine the stake amount – works for both sports (stake) and casino (bet)
    const amount = parseFloat(req.body.stake || req.body.bet || '0') || 0;

    // Detect if this is a casino bet (by checking for gameId or /casino path)
    const isCasinoBet = req.body.gameId || req.path.includes('/casino');

    // Check deposit limit (if it's a deposit request)
    if (req.path.includes('/deposit')) {
      const depositCheck = await checkDepositLimit(user._id, amount);
      if (!depositCheck.allowed) {
        return res.status(400).json({
          success: false,
          message: `Daily deposit limit of ${depositCheck.limit} ETB reached. You have ${depositCheck.remaining} ETB remaining today.`,
          code: 'DEPOSIT_LIMIT_REACHED',
          limit: depositCheck.limit,
          remaining: depositCheck.remaining
        });
      }
    }

    // Check loss and wager limits for both sports bets and casino bets
    if ((req.path.includes('/bet') || req.path.includes('/casino')) && amount > 0) {
      const lossCheck = await checkLossLimit(user._id, amount);
      if (!lossCheck.allowed) {
        return res.status(400).json({
          success: false,
          message: `Daily loss limit of ${lossCheck.limit} ETB reached. Current net loss: ${lossCheck.currentLoss} ETB.`,
          code: 'LOSS_LIMIT_REACHED',
          limit: lossCheck.limit,
          currentLoss: lossCheck.currentLoss
        });
      }

      const wagerCheck = await checkWagerLimit(user._id, amount);
      if (!wagerCheck.allowed) {
        return res.status(400).json({
          success: false,
          message: `Daily wager limit of ${wagerCheck.limit} ETB reached. You have ${wagerCheck.remaining} ETB remaining.`,
          code: 'WAGER_LIMIT_REACHED'
        });
      }
    }

    // Check session timeout for any action
    const sessionCheck = await checkSessionTimeout(user._id);
    if (!sessionCheck.allowed) {
      return res.status(400).json({
        success: false,
        message: `Your ${sessionCheck.limit} minute session limit has been reached. Please take a break.`,
        code: 'SESSION_TIMEOUT'
      });
    }

    return next();
  } catch (error) {
    return next();
  }
};

// ==================== SELF-EXCLUSION & COOLING-OFF ====================

export const checkSelfExclusion = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (user.responsibleGambling?.selfExcluded) {
      const endDate = user.responsibleGambling.selfExclusionEndDate;
      if (endDate && new Date(endDate) > new Date()) {
        return res.status(403).json({
          success: false,
          message: `Your account is self-excluded until ${new Date(endDate).toLocaleDateString()}. Please contact support if you wish to reactivate.`,
          code: 'SELF_EXCLUDED'
        });
      }
    }

    if (user.responsibleGambling?.coolingOffPeriodEnd && new Date(user.responsibleGambling.coolingOffPeriodEnd) > new Date()) {
      return res.status(403).json({
        success: false,
        message: `Your account is in cooling-off period until ${new Date(user.responsibleGambling.coolingOffPeriodEnd).toLocaleDateString()}.`,
        code: 'COOLING_OFF'
      });
    }

    return next();
  } catch (error: any) {
    return next(error);
  }
};

// ==================== CASINO-SPECIFIC SHORTCUT MIDDLEWARE ====================

/**
 * Convenience middleware that applies responsible gambling checks specifically to casino routes.
 * Can be used directly on /api/casino/play endpoint.
 */
export const checkCasinoBet = async (req: any, res: Response, next: NextFunction) => {
  return checkResponsibleGambling(req, res, next);
};