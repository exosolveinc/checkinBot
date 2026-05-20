/**
 * Main entry point for Check-In Bot
 * Exports Firebase Function and handles local development
 */

import * as dotenv from 'dotenv';
import { onRequest } from 'firebase-functions/v2/https';
import { CheckInBot } from './bot';

// Load environment variables for local development
dotenv.config();

// Initialize bot
const bot = new CheckInBot();

/**
 * Firebase Function for Slack bot (v2 syntax)
 */
export const slackBot = onRequest(
  {
    invoker: 'public',
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  bot.getExpressApp()
);

/**
 * For local development
 * Run with: npm run serve
 */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  bot.start(Number(PORT)).catch((error) => {
    console.error('Failed to start bot:', error);
    process.exit(1);
  });
}