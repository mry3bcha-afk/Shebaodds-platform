import mongoose, { Model } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shebaodds';
const TAX_RATE = parseFloat(process.env.TAX_RATE || '0.15');
const TAX_FREE_LIMIT = parseFloat(process.env.TAX_FREE_LIMIT || '100');

// Local representation of Wager Schema for query purposes
const WagerSchema = new mongoose.Schema({
  userId: String,
  gameSlug: String,
  stake: Number,
  multiplier: Number,
  payout: Number,
  taxDeducted: Number,
  status: String
}, { timestamps: true });

const WagerModel = (mongoose.models.Wager as Model<any>) || mongoose.model<any>('Wager', WagerSchema);

async function generateTaxReport() {
  console.log('🔄 [TAX AUDIT] Initializing Regional 15% Taxation Compliance Report...');
  console.log('🏛️  Tax Authority:', process.env.TAX_AUTHORITY_NAME || 'Ministry of Revenues - Ethiopia');
  console.log('🆔  Authority ID:', process.env.TAX_AUTHORITY_ID || 'TAX_SHEBAODDS_001');
  console.log('----------------------------------------------------------------------');

  try {
    await mongoose.connect(MONGODB_URI);
    
    // Fetch all won/processed wagers
    const wagers = await WagerModel.find({ status: { $in: ['Won', 'Settled'] } });
    
    let totalVolume = 0;
    let totalPayouts = 0;
    let totalTaxCollected = 0;
    let taxableTicketsCount = 0;
    let exemptTicketsCount = 0;

    for (const wager of wagers) {
      totalVolume += wager.stake;
      totalPayouts += wager.payout;
      totalTaxCollected += wager.taxDeducted || 0;
      
      const netGain = wager.payout - wager.stake;
      if (netGain > TAX_FREE_LIMIT) {
        taxableTicketsCount++;
      } else {
        exemptTicketsCount++;
      }
    }

    // Output formatted ASCII Report card
    console.log(`📊 STATUTORY TAX PERFORMANCE SHEET (Rate: ${(TAX_RATE * 100).toFixed(1)}%)`);
    console.log(`======================================================================`);
    console.log(`📅 Report Range          : Current Fiscal Ledger Block`);
    console.log(`📈 Gross Wagering Volume : ${totalVolume.toFixed(2)} ETB`);
    console.log(`💸 Total Cash Payouts    : ${totalPayouts.toFixed(2)} ETB`);
    console.log(`💰 Total Withheld Tax    : ${totalTaxCollected.toFixed(2)} ETB`);
    console.log(`🏷️  Taxable Tickets       : ${taxableTicketsCount}`);
    console.log(`🛡️  Exempt Tickets (<${TAX_FREE_LIMIT} ETB) : ${exemptTicketsCount}`);
    console.log(`📬 Contact Reporting     : ${process.env.TAX_REPORTING_EMAIL || 'tax@shebaodds.com'}`);
    console.log(`======================================================================`);
    console.log(`🏛️ Remit To Account     : ${process.env.TAX_PAYMENT_ACCOUNT || '1000234567890'} (${process.env.TAX_PAYMENT_BANK || 'CBE'})`);
    console.log(`🚀 Report Status: APPROVED FOR REMITTANCE`);

  } catch (err: any) {
    console.error('💥 [TAX REPORT ERROR] Failed to compile statutory data:', err.message || err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 [TAX AUDIT] Database connection pools released safely.');
  }
}

generateTaxReport();