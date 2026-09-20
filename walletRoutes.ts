// ============================================
// SHEBAODDS - WALLET ROUTES
// Complete Deposit/Withdrawal System
// ============================================

import express, { Request, Response, NextFunction, Router } from 'express';
import mongoose from 'mongoose';
import { authenticate } from './authRoutes';
import { checkResponsibleGambling } from './responsibleGamblingMiddleware';
import User from './User';
import { Transaction, TRANSACTION_TYPES, PAYMENT_METHODS, TRANSACTION_STATUS } from './Transaction';

const router: Router = express.Router();

// ==================== INTERFACES & HELPER SERVICES ====================
export interface ProcessDepositOptions {
  userId: any;
  amount: number;
  paymentMethod: string;
  paymentDetails: any;
  reference: string;
  callbackUrl: string;
}

export async function processDeposit(options: ProcessDepositOptions) {
  // Simulates mobile/gateway payments. Return true/instant for a premium mock feel.
  console.log(`[PaymentService] Processing Deposit: ${options.amount} ETB via ${options.paymentMethod}`);
  return {
    success: true,
    instant: true,
    gatewayReference: `GW_DEP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
  };
}

export interface ProcessWithdrawalOptions {
  userId: any;
  amount: number;
  paymentMethod: string;
  paymentDetails: any;
  reference: string;
}

export async function processWithdrawal(options: ProcessWithdrawalOptions) {
  // Simulates withdrawal disbursement.
  console.log(`[PaymentService] Processing Withdrawal disbursement: ${options.amount} ETB to account ${options.paymentDetails?.accountNumber || options.paymentDetails?.phoneNumber}`);
  return {
    success: true,
    gatewayReference: `GW_WDR_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
  };
}

export interface SendNotificationOptions {
  userId: any;
  title: string;
  message: string;
  type: string;
  data?: any;
}

export async function sendNotification(options: SendNotificationOptions) {
  console.log(`[NotificationService] Push notification to ${options.userId} - [${options.title}]: ${options.message}`);
  return { success: true };
}

// ==================== GET BALANCE ====================
router.get('/balance', authenticate, async (req: any, res: Response) => {
  try {
    const user = req.user;

    // Safety check ensuring wallet is fully initialized
    const wallet = user.wallet || {
      balance: 0,
      bonusBalance: 0,
      lockedBalance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalWagered: 0,
      totalWon: 0,
      totalTaxPaid: 0,
      currency: 'ETB'
    };

    res.json({
      success: true,
      balance: wallet.balance,
      bonusBalance: wallet.bonusBalance,
      lockedBalance: wallet.lockedBalance,
      totalDeposited: wallet.totalDeposited,
      totalWithdrawn: wallet.totalWithdrawn,
      totalWagered: wallet.totalWagered,
      totalWon: wallet.totalWon,
      totalTaxPaid: wallet.totalTaxPaid,
      currency: wallet.currency
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== GET TRANSACTIONS ====================
router.get('/transactions', authenticate, async (req: any, res: Response) => {
  try {
    const { limit = '50', page = '1', type, status, from, to } = req.query as any;
    const query: any = { userId: req.user._id };

    if (type) query.type = type;
    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const limitNum = parseInt(limit, 10) || 50;
    const pageNum = parseInt(page, 10) || 1;
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DEPOSIT ====================
router.post('/deposit', authenticate, checkResponsibleGambling, async (req: any, res: Response) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;
    const user = req.user;

    const minDeposit = parseInt(process.env.DEPOSIT_MIN_AMOUNT || '10', 10) || 10;
    const maxDeposit = parseInt(process.env.DEPOSIT_MAX_AMOUNT || '100000', 10) || 100000;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < minDeposit) {
      return res.status(400).json({ success: false, message: `Minimum deposit is ${minDeposit} ETB` });
    }
    if (depositAmount > maxDeposit) {
      return res.status(400).json({ success: false, message: `Maximum deposit is ${maxDeposit} ETB` });
    }

    // Safety initialization
    user.wallet = user.wallet || {
      balance: 0,
      bonusBalance: 0,
      lockedBalance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalWagered: 0,
      totalWon: 0,
      totalTaxPaid: 0,
      currency: 'ETB'
    };

    // Check daily deposit limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayDeposits = await Transaction.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(user._id as string), 
          type: TRANSACTION_TYPES.DEPOSIT, 
          status: TRANSACTION_STATUS.COMPLETED, 
          createdAt: { $gte: todayStart } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const depositedToday = todayDeposits[0]?.total || 0;
    const dailyLimit = typeof user.getDepositLimit === 'function' ? user.getDepositLimit() : (user.responsibleGambling?.depositLimit || 50000);

    if (depositedToday + depositAmount > dailyLimit) {
      return res.status(400).json({ 
        success: false, 
        message: `Daily deposit limit of ${dailyLimit} ETB reached. You have ${dailyLimit - depositedToday} ETB remaining today.`
      });
    }

    // Create transaction record
    const paymentReference = `DEP_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const transaction = new Transaction({
      userId: user._id,
      type: TRANSACTION_TYPES.DEPOSIT,
      amount: depositAmount,
      fee: 0,
      taxAmount: 0,
      netAmount: depositAmount,
      paymentMethod,
      paymentReference,
      paymentDetails,
      previousBalance: user.wallet.balance || 0,
      newBalance: (user.wallet.balance || 0) + depositAmount,
      status: TRANSACTION_STATUS.PENDING,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await transaction.save();

    // Process payment through gateway
    const paymentResult = await processDeposit({
      userId: user._id,
      amount: depositAmount,
      paymentMethod,
      paymentDetails,
      reference: paymentReference,
      callbackUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payments/callback`
    });

    if (!paymentResult.success) {
      transaction.status = TRANSACTION_STATUS.FAILED;
      transaction.failureReason = 'Payment failed';
      await transaction.save();
      return res.status(400).json({ success: false, message: 'Payment gateway rejected the deposit' });
    }

    // If payment is instant (like bonus, telebirr, CBE, or mock gateway), complete immediately
    if (paymentResult.instant) {
      user.wallet.balance = (user.wallet.balance || 0) + depositAmount;
      user.wallet.totalDeposited = (user.wallet.totalDeposited || 0) + depositAmount;

      transaction.status = TRANSACTION_STATUS.COMPLETED;
      transaction.completedAt = new Date();
      transaction.paymentGatewayReference = paymentResult.gatewayReference;

      await Promise.all([user.save(), transaction.save()]);

      // Send UI Notification
      await sendNotification({
        userId: user._id,
        title: 'Deposit Successful! 💰',
        message: `${depositAmount.toLocaleString()} ETB has been added to your wallet.`,
        type: 'deposit',
        data: { amount: depositAmount, newBalance: user.wallet.balance }
      });

      // Check for first deposit bonus
      const depositCount = await Transaction.countDocuments({
        userId: user._id,
        type: TRANSACTION_TYPES.DEPOSIT,
        status: TRANSACTION_STATUS.COMPLETED
      });

      if (depositCount === 1) {
        // First deposit bonus (50% up to 500 ETB)
        const bonusPercentage = parseInt(process.env.DEPOSIT_BONUS_PERCENTAGE || '50', 10) || 50;
        const maxBonus = parseInt(process.env.DEPOSIT_BONUS_MAX || '500', 10) || 500;
        const bonusAmount = Math.min((depositAmount * bonusPercentage) / 100, maxBonus);

        if (bonusAmount > 0) {
          user.wallet.bonusBalance = (user.wallet.bonusBalance || 0) + bonusAmount;
          await user.save();

          await sendNotification({
            userId: user._id,
            title: 'First Deposit Bonus! 🎁',
            message: `You received ${bonusAmount} ETB bonus on your first deposit!`,
            type: 'bonus',
            data: { bonusAmount }
          });
        }
      }

      return res.json({
        success: true,
        message: 'Deposit successful!',
        transactionId: transaction._id,
        newBalance: user.wallet.balance,
        bonusBalance: user.wallet.bonusBalance
      });
    }

    // For non-instant payments, return reference & info
    return res.json({
      success: true,
      message: 'Deposit initiated. Please complete the payment.',
      transactionId: transaction._id,
      reference: paymentReference
    });

  } catch (error: any) {
    console.error('Deposit error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== WITHDRAWAL ====================
router.post('/withdraw', authenticate, checkResponsibleGambling, async (req: any, res: Response) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;
    const user = req.user;

    const minWithdraw = parseInt(process.env.WITHDRAWAL_MIN_AMOUNT || '50', 10) || 50;
    const maxWithdraw = parseInt(process.env.WITHDRAWAL_MAX_AMOUNT || '50000', 10) || 50000;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < minWithdraw) {
      return res.status(400).json({ success: false, message: `Minimum withdrawal is ${minWithdraw} ETB` });
    }
    if (withdrawAmount > maxWithdraw) {
      return res.status(400).json({ success: false, message: `Maximum withdrawal per transaction is ${maxWithdraw} ETB` });
    }

    // Check balance
    user.wallet = user.wallet || {
      balance: 0,
      bonusBalance: 0,
      lockedBalance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalWagered: 0,
      totalWon: 0,
      totalTaxPaid: 0,
      currency: 'ETB'
    };

    if ((user.wallet.balance || 0) < withdrawAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Check daily withdrawal limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayWithdrawals = await Transaction.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(user._id as string), 
          type: TRANSACTION_TYPES.WITHDRAWAL, 
          status: TRANSACTION_STATUS.COMPLETED, 
          createdAt: { $gte: todayStart } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const withdrawnToday = todayWithdrawals[0]?.total || 0;
    const dailyLimit = parseInt(process.env.WITHDRAWAL_DAILY_LIMIT || '100000', 10) || 100000;

    if (withdrawnToday + withdrawAmount > dailyLimit) {
      return res.status(400).json({ 
        success: false, 
        message: `Daily withdrawal limit of ${dailyLimit} ETB reached. You have ${dailyLimit - withdrawnToday} ETB remaining today.`
      });
    }

    // Check weekly limit
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyWithdrawals = await Transaction.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(user._id as string), 
          type: TRANSACTION_TYPES.WITHDRAWAL, 
          status: TRANSACTION_STATUS.COMPLETED, 
          createdAt: { $gte: weekStart } 
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const withdrawnWeekly = weeklyWithdrawals[0]?.total || 0;
    const weeklyLimit = parseInt(process.env.WITHDRAWAL_WEEKLY_LIMIT || '500000', 10) || 500000;

    if (withdrawnWeekly + withdrawAmount > weeklyLimit) {
      return res.status(400).json({ 
        success: false, 
        message: `Weekly withdrawal limit of ${weeklyLimit} ETB reached.`
      });
    }

    // Lock the amount during review
    user.wallet.balance = (user.wallet.balance || 0) - withdrawAmount;
    user.wallet.lockedBalance = (user.wallet.lockedBalance || 0) + withdrawAmount;

    const paymentReference = `WDR_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const isVipLevelHigh = user.vip && user.vip.level >= 3;
    const requiresApproval = withdrawAmount > 10000 || !isVipLevelHigh;

    const transaction = new Transaction({
      userId: user._id,
      type: TRANSACTION_TYPES.WITHDRAWAL,
      amount: withdrawAmount,
      fee: 0,
      taxAmount: 0,
      netAmount: withdrawAmount,
      paymentMethod,
      paymentReference,
      paymentDetails,
      previousBalance: (user.wallet.balance || 0) + withdrawAmount,
      newBalance: user.wallet.balance || 0,
      status: TRANSACTION_STATUS.PENDING,
      requiresApproval,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await Promise.all([user.save(), transaction.save()]);

    // Send submit notification
    await sendNotification({
      userId: user._id,
      title: 'Withdrawal Request Submitted 💸',
      message: `Your withdrawal request of ${withdrawAmount.toLocaleString()} ETB has been submitted for processing.`,
      type: 'withdrawal',
      data: { amount: withdrawAmount, reference: paymentReference }
    });

    // Auto-approve for small amounts or high VIP tier
    if (!requiresApproval) {
      const result = await processWithdrawal({
        userId: user._id,
        amount: withdrawAmount,
        paymentMethod,
        paymentDetails,
        reference: paymentReference
      });

      if (result.success) {
        user.wallet.lockedBalance = (user.wallet.lockedBalance || 0) - withdrawAmount;
        user.wallet.totalWithdrawn = (user.wallet.totalWithdrawn || 0) + withdrawAmount;

        transaction.status = TRANSACTION_STATUS.COMPLETED;
        transaction.completedAt = new Date();
        transaction.paymentGatewayReference = result.gatewayReference;

        await Promise.all([user.save(), transaction.save()]);

        await sendNotification({
          userId: user._id,
          title: 'Withdrawal Completed ✅',
          message: `Your withdrawal of ${withdrawAmount.toLocaleString()} ETB has been processed and sent to your ${paymentMethod} account.`,
          type: 'withdrawal',
          data: { amount: withdrawAmount }
        });

        return res.json({
          success: true,
          message: 'Withdrawal processed successfully!',
          transactionId: transaction._id,
          newBalance: user.wallet.balance
        });
      }
    }

    return res.json({
      success: true,
      message: requiresApproval 
        ? 'Withdrawal request submitted for review. You will be notified once processed.' 
        : 'Withdrawal initiated. Please allow 2-24 hours for processing.',
      transactionId: transaction._id,
      requiresApproval,
      reference: paymentReference
    });

  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== GET WALLET SUMMARY ====================
router.get('/summary', authenticate, async (req: any, res: Response) => {
  try {
    const user = req.user;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayStats, weekStats, monthStats] = await Promise.all([
      Transaction.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(user._id as string), 
            status: TRANSACTION_STATUS.COMPLETED, 
            createdAt: { $gte: todayStart } 
          } 
        },
        { $group: {
          _id: null,
          deposits: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.DEPOSIT] }, '$amount', 0] } },
          withdrawals: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.WITHDRAWAL] }, '$amount', 0] } },
          wins: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.BET_WIN] }, '$amount', 0] } },
          losses: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.BET_LOSS] }, '$amount', 0] } }
        }}
      ]),
      Transaction.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(user._id as string), 
            status: TRANSACTION_STATUS.COMPLETED, 
            createdAt: { $gte: weekStart } 
          } 
        },
        { $group: {
          _id: null,
          deposits: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.DEPOSIT] }, '$amount', 0] } },
          withdrawals: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.WITHDRAWAL] }, '$amount', 0] } },
          wins: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.BET_WIN] }, '$amount', 0] } },
          losses: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.BET_LOSS] }, '$amount', 0] } }
        }}
      ]),
      Transaction.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(user._id as string), 
            status: TRANSACTION_STATUS.COMPLETED, 
            createdAt: { $gte: monthStart } 
          } 
        },
        { $group: {
          _id: null,
          deposits: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.DEPOSIT] }, '$amount', 0] } },
          withdrawals: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.WITHDRAWAL] }, '$amount', 0] } },
          wins: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.BET_WIN] }, '$amount', 0] } },
          losses: { $sum: { $cond: [{ $eq: ['$type', TRANSACTION_TYPES.BET_LOSS] }, '$amount', 0] } }
        }}
      ])
    ]);

    res.json({
      success: true,
      today: {
        deposits: todayStats[0]?.deposits || 0,
        withdrawals: todayStats[0]?.withdrawals || 0,
        wins: todayStats[0]?.wins || 0,
        losses: todayStats[0]?.losses || 0,
        netProfit: (todayStats[0]?.wins || 0) - (todayStats[0]?.losses || 0)
      },
      weekly: {
        deposits: weekStats[0]?.deposits || 0,
        withdrawals: weekStats[0]?.withdrawals || 0,
        wins: weekStats[0]?.wins || 0,
        losses: weekStats[0]?.losses || 0,
        netProfit: (weekStats[0]?.wins || 0) - (weekStats[0]?.losses || 0)
      },
      monthly: {
        deposits: monthStats[0]?.deposits || 0,
        withdrawals: monthStats[0]?.withdrawals || 0,
        wins: monthStats[0]?.wins || 0,
        losses: monthStats[0]?.losses || 0,
        netProfit: (monthStats[0]?.wins || 0) - (monthStats[0]?.losses || 0)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;