/**
 * ShebaOdds Tax Report Tool - JS Runtime Wrapper
 */
try {
  require('ts-node').register();
  require('./generate-tax-report.ts');
} catch (err) {
  console.error('💥 [TAX REPORT LOADER ERROR] Failed to generate tax compliance report:', err);
  process.exit(1);
}
