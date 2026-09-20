import mongoose, { Schema, Document, ClientSession } from 'mongoose';

// 1. Define the Wallet Schema Matrix
interface IWallet extends Document {
  userId: string;
  cashBalance: number;
  bonusBalance: number;
}

const WalletSchema = new Schema<IWallet>({
  userId: { type: String, required: true, unique: true, index: true },
  cashBalance: { type: Number, required: true, min: 0 }, // MongoDB schema validation prevents negative numbers
  bonusBalance: { type: Number, required: true, min: 0 }
});

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);

// 2. Define the Wager Ledger Schema Matrix
interface IWager extends Document {
  userId: string;
  gameSlug: string;
  stake: number;
  multiplier: number;
  payout: number;
  taxDeducted: number;
  status: 'Pending' | 'Won' | 'Lost';
}

const WagerSchema = new Schema<IWager>({
  userId: { type: String, required: true, index: true },
  gameSlug: { type: String, required: true },
  stake: { type: Number, required: true },
  multiplier: { type: Number, required: true },
  payout: { type: Number, required: true },
  taxDeducted: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Won', 'Lost'], required: true }
}, { timestamps: true });

export const Wager = mongoose.model<IWager>('Wager', WagerSchema);

// 3. Core Transaction Service Subsystem
export class MongoDBWalletEngine {
  
  /**
   * Processes a real-time casino round (e.g., Aviator crash resolve) inside an isolated ACID session.
   */
  public async processCasinoTurn(
    userId: string,
    gameSlug: string,
    stake: number,
    achievedMultiplier: number
  ): Promise<{ success: boolean; netPayout: number; error?: string }> {
    
    // Start an isolated, distributed transaction session thread
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step 1: Securely locate the user wallet inside the session context
      // { session } functions exactly like PostgreSQL's "SELECT FOR UPDATE" write lock
      const wallet = await Wallet.findOne({ userId }).session(session);

      if (!wallet) {
        throw new Error('Wallet document not found for matching client identity');
      }

      if (wallet.cashBalance < stake) {
        throw new Error('Insufficient wallet liquidity reserves');
      }

      // Step 2: Calculate financial equations and apply regional 10% withholding tax
      const isWin = achievedMultiplier > 0;
      const grossPayout = isWin ? stake * achievedMultiplier : 0;
      const netProfit = isWin && grossPayout > stake ? grossPayout - stake : 0;
      const taxAmount = netProfit * 0.10; // 10% statutory tax rule matching ShebaOdds core rules
      const finalNetReturn = grossPayout - taxAmount;

      // Step 3: Mutate financial balances within the active atomic session scope
      // The stake is deducted and net winnings (minus tax) are credited back instantly
      wallet.cashBalance = wallet.cashBalance - stake + finalNetReturn;
      
      // Save changes back to the collection using the active transaction thread
      await wallet.save({ session });

      // Step 4: Write audit trail receipt records into the database logs
      await Wager.create([{
        userId,
        gameSlug,
        stake,
        multiplier: achievedMultiplier,
        payout: finalNetReturn,
        taxDeducted: taxAmount,
        status: isWin ? 'Won' : 'Lost'
      }], { session });

      // If all operations succeed without a collision, commit changes permanently to disk
      await session.commitTransaction();
      return { success: true, netPayout: finalNetReturn };

    } catch (error: any) {
      // If a database collision or insufficient funds error occurs, trigger a full rollback
      // Both the balance update and the wager log are completely undone
      await session.abortTransaction();
      return { success: false, netPayout: 0, error: error.message };

    } finally {
      // Terminate the processing session pipeline to release connection locks back to the pool
      await session.endSession();
    }
  }
}
