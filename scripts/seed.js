/**
 * ShebaOdds Seeding Tool - JS Runtime Wrapper
 */
try {
  require('ts-node').register();
  require('./seed.ts');
} catch (err) {
  console.error('💥 [SEED LOADER ERROR] Failed to run database seed process:', err);
  process.exit(1);
}
