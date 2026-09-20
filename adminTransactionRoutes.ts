// ============================================
// SHEBAODDS - ADMIN TRANSACTION ROUTES
// MOCK PAYMENT ADMIN APPROVAL SYSTEM
// ============================================

import express, {
  Response,
  Router
} from 'express';

import mongoose from 'mongoose';

import {
  authenticate
} from './authRoutes';

import User from './User';

import {
  Transaction,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS
} from './Transaction';

import {
  sendNotification,
  processWithdrawal
} from './walletRoutes';

const router: Router =
  express.Router();

// ==================================================
// ADMIN CHECK
// ==================================================

function requireAdmin(
  req: any,
  res: Response,
  next: any
) {

  const user = req.user;

  if (!user) {

    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const isAdmin =
    user.role === 'admin' ||
    user.role === 'superadmin';

  if (!isAdmin) {

    return res.status(403).json({
      success: false,
      message: 'Administrator access required'
    });
  }

  next();
}

// ==================================================
// GET PENDING TRANSACTIONS
// ==================================================

router.get(
  '/pending',
  authenticate,
  requireAdmin,
  async (req: any, res: Response) => {

    try {

      const {
        type,
        page = '1',
        limit = '50'
      } = req.query;

      const query: any = {

        status:
          TRANSACTION_STATUS.PENDING,

        requiresApproval: true
      };

      if (
        type === TRANSACTION_TYPES.DEPOSIT ||
        type === TRANSACTION_TYPES.WITHDRAWAL
      ) {

        query.type = type;
      } else {

        query.type = {
          $in: [
            TRANSACTION_TYPES.DEPOSIT,
            TRANSACTION_TYPES.WITHDRAWAL
          ]
        };
      }

      const pageNum =
        Math.max(
          parseInt(page, 10) || 1,
          1
        );

      const limitNum =
        Math.min(
          parseInt(limit, 10) || 50,
          100
        );

      const skip =
        (pageNum - 1) *
        limitNum;

      const [
        transactions,
        total
      ] = await Promise.all([

        Transaction.find(query)

          .populate(
            'userId',
            'username email fullName phone wallet'
          )

          .sort({
            createdAt: -1
          })

          .skip(skip)

          .limit(limitNum),

        Transaction.countDocuments(query)
      ]);

      return res.json({

        success: true,

        transactions,

        pagination: {

          total,

          page:
            pageNum,

          limit:
            limitNum,

          pages:
            Math.ceil(
              total / limitNum
            )
        }
      });

    } catch (error: any) {

      console.error(
        'Admin pending transaction error:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// ==================================================
// APPROVE DEPOSIT
// ==================================================

router.post(
  '/:transactionId/approve-deposit',
  authenticate,
  requireAdmin,
  async (req: any, res: Response) => {

    const session =
      await mongoose.startSession();

    try {

      const {
        transactionId
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          transactionId
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid transaction ID'
        });
      }

      session.startTransaction();

      const transaction =
        await Transaction.findOne({

          _id: transactionId,

          type:
            TRANSACTION_TYPES.DEPOSIT,

          status:
            TRANSACTION_STATUS.PENDING,

          requiresApproval: true

        }).session(session);

      if (!transaction) {

        await session.abortTransaction();

        return res.status(404).json({

          success: false,

          message:
            'Pending deposit not found or already processed'
        });
      }

      const user =
        await User.findById(
          transaction.userId
        ).session(session);

      if (!user) {

        await session.abortTransaction();

        return res.status(404).json({

          success: false,

          message:
            'User not found'
        });
      }

      // ==================== INITIALIZE WALLET ====================

      if (!user.wallet) {

        user.wallet = {

          balance: 0,

          bonusBalance: 0,

          lockedBalance: 0,

          totalDeposited: 0,

          totalWithdrawn: 0,

          totalWagered: 0,

          totalWon: 0,

          totalLost: 0,

          totalTaxPaid: 0,

          totalBonusReceived: 0,

          totalCashbackReceived: 0,

          currency: 'ETB'
        };
      }

      // ==================== CREDIT WALLET ====================

      const oldBalance =
        Number(
          user.wallet.balance || 0
        );

      const newBalance =
        oldBalance +
        transaction.netAmount;

      user.wallet.balance =
        newBalance;

      user.wallet.totalDeposited =
        Number(
          user.wallet.totalDeposited || 0
        ) +
        transaction.amount;

      // ==================== TRANSACTION ====================

      transaction.previousBalance =
        oldBalance;

      transaction.newBalance =
        newBalance;

      transaction.previousBonusBalance =
        Number(
          user.wallet.bonusBalance || 0
        );

      transaction.newBonusBalance =
        Number(
          user.wallet.bonusBalance || 0
        );

      transaction.status =
        TRANSACTION_STATUS.COMPLETED;

      transaction.requiresApproval =
        false;

      transaction.approvedBy =
        req.user._id;

      transaction.approvedAt =
        new Date();

      transaction.processedBy =
        req.user._id;

      transaction.processedAt =
        new Date();

      transaction.completedAt =
        new Date();

      transaction.paymentGatewayReference =
        transaction.paymentGatewayReference ||
        `MOCK_APPROVED_DEP_${Date.now()}`;

      transaction.notes =
        `Approved by admin ${req.user._id}`;

      await user.save({
        session
      });

      await transaction.save({
        session
      });

      await session.commitTransaction();

      // ==================== NOTIFICATION ====================

      await sendNotification({

        userId:
          user._id,

        title:
          'Deposit Approved ✅',

        message:
          `${transaction.amount.toLocaleString()} ETB has been added to your wallet.`,

        type:
          'deposit_approved',

        data: {

          transactionId:
            transaction._id,

          amount:
            transaction.amount,

          newBalance
        }
      });

      return res.json({

        success: true,

        message:
          'Deposit approved successfully',

        transactionId:
          transaction._id,

        amount:
          transaction.amount,

        newBalance
      });

    } catch (error: any) {

      await session.abortTransaction();

      console.error(
        'Approve deposit error:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          error.message
      });

    } finally {

      await session.endSession();
    }
  }
);

// ==================================================
// REJECT DEPOSIT
// ==================================================

router.post(
  '/:transactionId/reject-deposit',
  authenticate,
  requireAdmin,
  async (req: any, res: Response) => {

    try {

      const {
        transactionId
      } = req.params;

      const {
        reason
      } = req.body;

      const transaction =
        await Transaction.findOne({

          _id: transactionId,

          type:
            TRANSACTION_TYPES.DEPOSIT,

          status:
            TRANSACTION_STATUS.PENDING,

          requiresApproval: true
        });

      if (!transaction) {

        return res.status(404).json({

          success: false,

          message:
            'Pending deposit not found or already processed'
        });
      }

      transaction.status =
        TRANSACTION_STATUS.FAILED;

      transaction.requiresApproval =
        false;

      transaction.failureReason =
        reason ||
        'Deposit rejected by administrator';

      transaction.approvedBy =
        req.user._id;

      transaction.approvedAt =
        new Date();

      transaction.processedBy =
        req.user._id;

      transaction.processedAt =
        new Date();

      transaction.notes =
        `Rejected by admin ${req.user._id}`;

      await transaction.save();

      await sendNotification({

        userId:
          transaction.userId,

        title:
          'Deposit Rejected ❌',

        message:
          reason ||
          'Your deposit was rejected by the administrator.',

        type:
          'deposit_rejected',

        data: {

          transactionId:
            transaction._id,

          reason
        }
      });

      return res.json({

        success: true,

        message:
          'Deposit rejected',

        transactionId:
          transaction._id
      });

    } catch (error: any) {

      return res.status(500).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// ==================================================
// APPROVE WITHDRAWAL
// ==================================================

router.post(
  '/:transactionId/approve-withdrawal',
  authenticate,
  requireAdmin,
  async (req: any, res: Response) => {

    const session =
      await mongoose.startSession();

    try {

      const {
        transactionId
      } = req.params;

      session.startTransaction();

      const transaction =
        await Transaction.findOne({

          _id: transactionId,

          type:
            TRANSACTION_TYPES.WITHDRAWAL,

          status:
            TRANSACTION_STATUS.PENDING,

          requiresApproval: true

        }).session(session);

      if (!transaction) {

        await session.abortTransaction();

        return res.status(404).json({

          success: false,

          message:
            'Pending withdrawal not found or already processed'
        });
      }

      const user =
        await User.findById(
          transaction.userId
        ).session(session);

      if (!user) {

        await session.abortTransaction();

        return res.status(404).json({

          success: false,

          message:
            'User not found'
        });
      }

      if (!user.wallet) {

        await session.abortTransaction();

        return res.status(400).json({

          success: false,

          message:
            'User wallet not found'
        });
      }

      const locked =
        Number(
          user.wallet.lockedBalance || 0
        );

      if (
        locked <
        transaction.amount
      ) {

        await session.abortTransaction();

        return res.status(400).json({

          success: false,

          message:
            'Locked withdrawal amount is insufficient'
        });
      }

      // ==================== MOCK GATEWAY ====================

      const paymentResult =
        await processWithdrawal({

          userId:
            user._id,

          amount:
            transaction.amount,

          paymentMethod:
            transaction.paymentMethod || '',

          paymentDetails:
            transaction.paymentDetails,

          reference:
            transaction.paymentReference || ''
        });

      if (!paymentResult.success) {

        await session.abortTransaction();

        return res.status(400).json({

          success: false,

          message:
            'Mock withdrawal payment failed'
        });
      }

      // ==================== RELEASE LOCK ====================

      user.wallet.lockedBalance =
        locked -
        transaction.amount;

      user.wallet.totalWithdrawn =
        Number(
          user.wallet.totalWithdrawn || 0
        ) +
        transaction.amount;

      // Balance was already reserved
      // when the withdrawal was requested.

      // ==================== COMPLETE ====================

      transaction.status =
        TRANSACTION_STATUS.COMPLETED;

      transaction.requiresApproval =
        false;

      transaction.approvedBy =
        req.user._id;

      transaction.approvedAt =
        new Date();

      transaction.processedBy =
        req.user._id;

      transaction.processedAt =
        new Date();

      transaction.completedAt =
        new Date();

      transaction.paymentGatewayReference =
        paymentResult.gatewayReference;

      transaction.notes =
        `Withdrawal approved by admin ${req.user._id}`;

      await user.save({
        session
      });

      await transaction.save({
        session
      });

      await session.commitTransaction();

      await sendNotification({

        userId:
          user._id,

        title:
          'Withdrawal Approved ✅',

        message:
          `${transaction.amount.toLocaleString()} ETB withdrawal has been processed.`,

        type:
          'withdrawal_approved',

        data: {

          transactionId:
            transaction._id,

          amount:
            transaction.amount,

          gatewayReference:
            paymentResult.gatewayReference
        }
      });

      return res.json({

        success: true,

        message:
          'Withdrawal approved successfully',

        transactionId:
          transaction._id,

        amount:
          transaction.amount,

        gatewayReference:
          paymentResult.gatewayReference
      });

    } catch (error: any) {

      await session.abortTransaction();

      console.error(
        'Approve withdrawal error:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          error.message
      });

    } finally {

      await session.endSession();
    }
  }
);

// ==================================================
// REJECT WITHDRAWAL
// ==================================================

router.post(
  '/:transactionId/reject-withdrawal',
  authenticate,
  requireAdmin,
  async (req: any, res: Response) => {

    const session =
      await mongoose.startSession();

    try {

      const {
        transactionId
      } = req.params;

      const {
        reason
      } = req.body;

      session.startTransaction();

      const transaction =
        await Transaction.findOne({

          _id: transactionId,

          type:
            TRANSACTION_TYPES.WITHDRAWAL,

          status:
            TRANSACTION_STATUS.PENDING,

          requiresApproval: true

        }).session(session);

      if (!transaction) {

        await session.abortTransaction();

        return res.status(404).json({

          success: false,

          message:
            'Pending withdrawal not found'
        });
      }

      const user =
        await User.findById(
          transaction.userId
        ).session(session);

      if (!user) {

        await session.abortTransaction();

        return res.status(404).json({

          success: false,

          message:
            'User not found'
        });
      }

      if (user.wallet) {

        user.wallet.lockedBalance =
          Math.max(

            0,

            Number(
              user.wallet.lockedBalance || 0
            ) -
            transaction.amount
          );

        // IMPORTANT:
        // Balance was never deducted.
        // It was only locked.
        //
        // Therefore rejecting the withdrawal
        // only releases the lock.
      }

      transaction.status =
        TRANSACTION_STATUS.CANCELLED;

      transaction.requiresApproval =
        false;

      transaction.failureReason =
        reason ||
        'Withdrawal rejected by administrator';

      transaction.approvedBy =
        req.user._id;

      transaction.approvedAt =
        new Date();

      transaction.processedBy =
        req.user._id;

      transaction.processedAt =
        new Date();

      transaction.notes =
        `Rejected by admin ${req.user._id}`;

      await user.save({
        session
      });

      await transaction.save({
        session
      });

      await session.commitTransaction();

      await sendNotification({

        userId:
          user._id,

        title:
          'Withdrawal Rejected ❌',

        message:
          reason ||
          'Your withdrawal request was rejected. The funds have been released back to your available balance.',

        type:
          'withdrawal_rejected',

        data: {

          transactionId:
            transaction._id,

          amount:
            transaction.amount,

          reason
        }
      });

      return res.json({

        success: true,

        message:
          'Withdrawal rejected and funds released',

        transactionId:
          transaction._id,

        amount:
          transaction.amount
      });

    } catch (error: any) {

      await session.abortTransaction();

      return res.status(500).json({

        success: false,

        message:
          error.message
      });

    } finally {

      await session.endSession();
    }
  }
);

export default router;