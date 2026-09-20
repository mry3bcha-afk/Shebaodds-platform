import mongoose from 'mongoose';
import { JackpotPool, JackpotTicket } from './jackpotSchema';

export async function evaluateJackpotPool(poolId: string, actualOutcomes: string[]) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Lock the pool document
    const pool = await JackpotPool.findById(poolId).session(session);
    if (!pool || pool.status !== 'Locked') throw new Error('Jackpot pool not eligible for settlement');

    pool.results = actualOutcomes;
    pool.status = 'Settled';
    await pool.save({ session });

    // 2. Fetch all tickets bought for this specific jackpot
    const tickets = await JackpotTicket.find({ jackpotPoolId: poolId }).session(session);

    for (const ticket of tickets) {
      let correctCount = 0;
      
      // Calculate matches guessed correctly
      for (let i = 0; i < 12; i++) {
        if (ticket.predictions[i] === actualOutcomes[i]) {
          correctCount++;
        }
      }

      ticket.correctGuessesCount = correctCount;
      
      // Check if the user guessed all 12 correctly
      if (correctCount === 12) {
        ticket.isWinner = true;
        
        // Distribute the 100,000 ETB Prize
        const prizeMoney = pool.grandPrize;
        const netProfit = prizeMoney - pool.entryFee;
        const taxDeduction = netProfit * 0.10; // 10% Withholding Tax
        const userNetPayout = prizeMoney - taxDeduction;

        // Credit User Wallet inside the secure session pipeline
        await mongoose.model('Wallet').updateOne(
          { userId: ticket.userId },
          { $inc: { cashBalance: userNetPayout } }
        ).session(session);
      }

      await ticket.save({ session });
    }

    await session.commitTransaction();
    console.log(`🏆 [JACKPOT SETTLED] Pool ${poolId} processed successfully.`);
  } catch (err) {
    await session.abortTransaction();
    console.error('❌ [JACKPOT ERROR] Settlement rolled back:', err);
  } finally {
    session.endSession();
  }
}
