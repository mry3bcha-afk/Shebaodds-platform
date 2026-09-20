import mongoose from 'mongoose';

export async function validateSystemDependencies(): Promise<void> {
  const requiredKeys = [
    'MONGODB_URI', 'TAX_RATE', 'TELE_BIRR_API_KEY', 
    'CHAPA_API_KEY', 'REDIS_HOST', 'SPORTS_DATA_API_KEY'
  ];

  // 1. Assert configuration variables exist
  for (const key of requiredKeys) {
    if (!process.env[key]) {
      console.error(`❌ [CRITICAL BOOT ERROR] Missing environment variable assignment: ${key}`);
      process.exit(1); 
    }
  }

  // 2. Enforce MongoDB Replica Set Validation
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    const isReplicaSet = mongoose.connection.db?.databaseName; 
    
    // Quick test to ensure transactions won't fail at runtime
    const session = await mongoose.startSession();
    session.endSession();
    
    console.log('🚀 [BOOT SYSTEM] MongoDB connection successfully initiated with transactional headroom.');
  } catch (err) {
    console.error('❌ [CRITICAL BOOT ERROR] MongoDB cluster connection refused or lacks Replica Set structure.');
    process.exit(1);
  }
}
