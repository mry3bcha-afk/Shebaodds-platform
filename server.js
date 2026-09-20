/**
 * SHEBAODDS
 * JavaScript entry point for Render
 *
 * Loads the TypeScript server using ts-node.
 */

'use strict';

try {
  require('dotenv').config();

  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
      target: 'ES2022',
      moduleResolution: 'node',
      esModuleInterop: true,
      allowSyntheticDefaultImports: true
    }
  });

  require('./server.ts');

} catch (error) {
  console.error('==============================================');
  console.error('SHEBAODDS SERVER STARTUP ERROR');
  console.error('==============================================');
  console.error(error);
  console.error('==============================================');

  process.exit(1);
}