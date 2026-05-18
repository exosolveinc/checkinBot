/**
 * Main entry point for Check-In Bot
 * Exports Firebase Function and handles local development
 */

import * as dotenv from "dotenv";
import {onRequest} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {WebClient} from "@slack/web-api";
import {CheckInBot} from "./bot";
import {SlackUIService} from "./services/slack-ui.service";

dotenv.config();

const bot = new CheckInBot();

const STANDUP_CHANNEL_DEFAULT = process.env.STANDUP_CHANNEL_DEFAULT;

/**
 * Slack bot HTTP handler.
 */
export const slackBot = onRequest(
  {
    invoker: "public",
    cors: true,
    region: "asia-south1",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  bot.getExpressApp()
);

/**
 * Firestore trigger: when a standup is created,
 * post the summary to the standup channel.
 */
export const onStandupCreated = onDocumentCreated(
  {
    document: "standups/{standupId}",
    region: "asia-south1",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const slackClient = new WebClient(
      process.env.SLACK_BOT_TOKEN
    );
    const uiService = new SlackUIService();

    try {
      const msg = uiService.buildStandupSummaryMessage(data);
      await slackClient.chat.postMessage({
        channel: data.channelId || STANDUP_CHANNEL_DEFAULT,
        blocks: msg.blocks,
        attachments: msg.attachments,
        text: `${data.userName}'s standup for ${data.date}`,
      });
    } catch (error) {
      console.error("Error posting standup to channel:", error);
    }
  }
);

/**
 * For local development.
 */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  bot.start(Number(PORT)).catch((error) => {
    console.error("Failed to start bot:", error);
    process.exit(1);
  });
}
