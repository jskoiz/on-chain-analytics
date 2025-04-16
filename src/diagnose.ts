/**
 * Diagnostic script to check system configuration and connections
 * Run with: npx ts-node src/diagnose.ts
 */

import { runDiagnostics } from './utils/diagnostics';
import logger from './utils/logger';

// Run diagnostics and exit
(async () => {
  try {
    logger.info('Starting diagnostic checks...');
    await runDiagnostics();
    logger.info('Diagnostics completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Diagnostics failed', { error });
    process.exit(1);
  }
})();