import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/*
|--------------------------------------------------------------------------
| REQUIRED ENVIRONMENT VARIABLES
|--------------------------------------------------------------------------
*/

const REQUIRED_ENV_VARIABLES = [
  'MONGODB_URI'
];

/*
|--------------------------------------------------------------------------
| ENVIRONMENT VALIDATION
|--------------------------------------------------------------------------
*/

function verifyEnvironmentMappings(): void {
  console.log('');
  console.log('🔄 [BOOTSTRAP] Checking environment configuration...');
  console.log('----------------------------------------------------');

  const missingVars: string[] = [];

  for (const variable of REQUIRED_ENV_VARIABLES) {
    const value = process.env[variable];

    if (!value || value.trim() === '') {
      missingVars.push(variable);
    }
  }

  if (missingVars.length > 0) {
    console.error('');
    console.error(
      '❌ [BOOTSTRAP] Missing environment variables:'
    );

    missingVars.forEach((variable) => {
      console.error(`   ❌ ${variable}`);
    });

    throw new Error(
      `Missing environment variables: ${missingVars.join(', ')}`
    );
  }

  console.log(
    '✅ [BOOTSTRAP] Required environment variables configured.'
  );

  console.log('----------------------------------------------------');
}

/*
|--------------------------------------------------------------------------
| MONGODB
|--------------------------------------------------------------------------
*/

async function connectToMongoDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  console.log(
    '🔄 [BOOTSTRAP] Connecting to MongoDB...'
  );

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      // Was connecting to 'test' — the MongoDB driver's default when the URI has
      // no database name in its path. Explicit dbName here means the app always
      // uses the right database regardless of what the URI itself specifies, and
      // MONGODB_DB_NAME lets it be overridden per-environment without editing the
      // connection string (which contains credentials).
      dbName: process.env.MONGODB_DB_NAME || 'shebaodds'
    });

    console.log(
      '✅ [BOOTSTRAP] MongoDB connection established.'
    );

    console.log(
      `📦 Database: ${mongoose.connection.name || 'unknown'}`
    );

    try {
      const adminDb = mongoose.connection.db?.admin();

      if (adminDb) {
        const status = await adminDb
          .command({ hello: 1 })
          .catch(() => null);

        if (status) {
          console.log(
            '✅ [BOOTSTRAP] MongoDB server responded successfully.'
          );

          if (status.setName) {
            console.log(
              `🔐 Replica Set: ${status.setName}`
            );
          }
        }
      }
    } catch {
      console.warn(
        '⚠️ MongoDB capability check skipped.'
      );
    }

  } catch (error: any) {
    console.error('');
    console.error(
      '❌ [BOOTSTRAP] MongoDB connection failed.'
    );

    console.error(
      error?.message || error
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| BOOTSTRAP ENGINE
|--------------------------------------------------------------------------
*/

export async function bootstrapAppEngine(): Promise<void> {
  console.log('');
  console.log(
    '🚀 [BOOTSTRAP] Starting SHEBAODDS backend...'
  );

  console.log(
    '===================================================='
  );

  verifyEnvironmentMappings();

  await connectToMongoDB();

  console.log(
    '===================================================='
  );

  console.log(
    '✅ [BOOTSTRAP SUCCESS] SHEBAODDS backend initialized.'
  );

  console.log(
    '===================================================='
  );

  console.log('');
}

/*
|--------------------------------------------------------------------------
| DIRECT EXECUTION
|--------------------------------------------------------------------------
*/

if (require.main === module) {
  bootstrapAppEngine()
    .then(() => {
      console.log(
        '✅ Bootstrap process completed.'
      );
    })
    .catch((error) => {
      console.error('');
      console.error(
        '💥 [BOOTSTRAP PANIC] Startup failed.'
      );

      console.error(
        error?.message || error
      );

      process.exit(1);
    });
}