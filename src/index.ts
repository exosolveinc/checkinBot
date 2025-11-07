/**
 * Main entry point for Check-In Bot
 * Exports Firebase Function and handles local development
 */

import * as dotenv from 'dotenv';
import * as functions from 'firebase-functions';
import { CheckInBot } from './bot';

// Load environment variables for local development
dotenv.config();

// Initialize bot
const bot = new CheckInBot();

/**
 * Firebase Function for Slack bot (v2 syntax)
 */
export const slackBot = functions.https.onRequest(bot.getExpressApp());

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