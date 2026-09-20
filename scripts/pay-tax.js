/**
 * ShebaOdds Tax Payment Tool - JS Runtime Wrapper
 */
try {
  require('ts-node').register();
  require('./pay-tax.ts');
} catch (err) {
  console.error('💥 [TAX REMIT LOADER ERROR] Failed to run tax payment process:', err);
  process.exit(1);
}
