/**
 * Check-In Bot
 * Main bot implementation with command handlers
 */

import {App, ExpressReceiver} from "@slack/bolt";

import {FirebaseService}
  from "./services/firebase.service";
import {SlackUIService}
  from "./services/slack-ui.service";

/**
 * Channels allowed to invoke /checkin and /standup.
 * Standups posted back to whichever of these the user invoked from.
 */
const ALLOWED_STANDUP_CHANNELS = new Set([
  "C01C0C6HYKE", // devs
  "C08UFUB9NHM", // interns
]);

/**
 * Main Check-In Bot class that handles Slack
 * commands and interactions.
 */
export class CheckInBot {
  private app: App;
  private receiver: ExpressReceiver;
  private firebaseService: FirebaseService;
  private slackUIService: SlackUIService;

  /**
   * Creates a new CheckInBot instance.
   */
  constructor() {
    if (!process.env.SLACK_SIGNING_SECRET) {
      throw new Error("SLACK_SIGNING_SECRET is required");
    }
    if (!process.env.SLACK_BOT_TOKEN) {
      throw new Error("SLACK_BOT_TOKEN is required");
    }

    this.firebaseService = new FirebaseService();
    this.slackUIService = new SlackUIService();

    this.receiver = new ExpressReceiver({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      processBeforeResponse: true,
      endpoints: "/",
    });

    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      receiver: this.receiver,
    });

    this.registerCommands();
    this.registerViewSubmissions();
    this.registerAppHome();
  }

  /**
   * Register slash commands.
   */
  private registerCommands(): void {
    this.app.command(
      "/checkin",
      async ({command, ack, client, respond}) => {
        await ack();

        if (!ALLOWED_STANDUP_CHANNELS.has(command.channel_id)) {
          await respond({
            text: "⚠️ Please run this in your standup channel " +
              "(#interns-standup or #devs-standup).",
            response_type: "ephemeral",
          });
          return;
        }

        try {
          await client.views.open({
            trigger_id: command.trigger_id,
            view: this.slackUIService
              .buildQuickStandupModal(command.channel_id),
          });
        } catch (error) {
          console.error("Error handling /checkin:", error);
        }
      }
    );

    this.app.command(
      "/standup",
      async ({command, ack, client, respond}) => {
        await ack();

        if (!ALLOWED_STANDUP_CHANNELS.has(command.channel_id)) {
          await respond({
            text: "⚠️ Please run this in your standup channel " +
              "(#interns-standup or #devs-standup).",
            response_type: "ephemeral",
          });
          return;
        }

        try {
          await client.views.open({
            trigger_id: command.trigger_id,
            view: this.slackUIService
              .buildQuickStandupModal(command.channel_id),
          });
        } catch (error) {
          console.error("Error handling /standup:", error);
        }
      }
    );

    this.app.command(
      "/checkout",
      async ({command, ack, client, respond}) => {
        await ack();

        try {
          const userId = command.user_id;
          const userName = command.user_name;

          await this.firebaseService.saveCheckIn({
            userId,
            userName,
            userEmail: "",
            type: "checkout",
            timestamp: new Date(),
          });

          await client.chat.postMessage({
            channel: command.channel_id,
            text: `👋 ${userName} has checked out for the day!`,
          });
        } catch (error) {
          console.error("Error handling /checkout:", error);
          await respond({
            text: "❌ Error processing check-out. Please try again.",
            response_type: "ephemeral",
          });
        }
      }
    );

    this.app.command("/status", async ({command, ack, respond}) => {
      await ack();

      try {
        const userId = command.user_id;
        const userName = command.user_name;

        const isCheckedIn =
          await this.firebaseService.isUserCheckedIn(userId);
        const lastCheckIn =
          await this.firebaseService.getLastCheckIn(userId);
        const stats =
          await this.firebaseService.getUserStats(userId, 30);

        await respond({
          blocks: this.slackUIService.buildStatusMessage(
            userName,
            isCheckedIn,
            lastCheckIn?.timestamp || null,
            stats
          ),
          response_type: "ephemeral",
        });
      } catch (error) {
        console.error("Error handling /status:", error);
        await respond({
          text: "❌ Error getting status.",
          response_type: "ephemeral",
        });
      }
    });
  }

  /**
   * Register view submission handlers.
   */
  private registerViewSubmissions(): void {
    this.app.view(
      "quick_standup_submit",
      async ({ack, view, body}) => {
        await ack();

        try {
          const userId = body.user.id;
          const userName = body.user.name || "User";
          const v = view.state.values;
          const channelId = view.private_metadata || "";

          const dateStr =
            new Date().toISOString().split("T")[0];

          // Save flat standup data — Firestore trigger
          // handles posting to channel
          await this.firebaseService.saveStandup({
            userId,
            userName,
            feeling: v.feeling_selection?.feeling
              ?.selected_option?.value || "good",
            yesterday: v.yesterday_summary
              ?.summary_input?.value || "",
            today: v.today_plan
              ?.plan_input?.value || "",
            blockers: v.blockers
              ?.blockers_input?.value || "",
            accomplishment: v.accomplishment
              ?.accomplishment_input?.value || "",
            notionUpdated: v.notion_updated
              ?.notion_select?.selected_option?.value || "no",
            date: dateStr,
            timestamp: new Date(),
            channelId,
          } as any);

          // Save check-in record for time tracking
          await this.firebaseService.saveCheckIn({
            userId,
            userName,
            userEmail: "",
            type: "checkin",
            timestamp: new Date(),
          });
        } catch (error) {
          console.error("Error handling standup submit:", error);
        }
      }
    );
  }

  /**
   * Register app home handlers.
   */
  private registerAppHome(): void {
    this.app.event(
      "app_home_opened",
      async ({event, client}) => {
        try {
          const userId = event.user;
          const userInfo =
            await client.users.info({user: userId});
          const userName =
            userInfo.user?.real_name ||
            userInfo.user?.name || "User";

          const isCheckedIn =
            await this.firebaseService.isUserCheckedIn(userId);
          const lastCheckIn =
            await this.firebaseService.getLastCheckIn(userId);
          const stats =
            await this.firebaseService.getUserStats(userId, 30);

          const today =
            new Date().toISOString().split("T")[0];
          const todayStandup =
            await this.firebaseService
              .getStandupByDate(userId, today);

          await client.views.publish({
            user_id: userId,
            view: this.slackUIService.buildAppHomeView(
              userName,
              isCheckedIn,
              lastCheckIn,
              stats,
              todayStandup
            ),
          });
        } catch (error) {
          console.error("Error publishing home view:", error);
        }
      }
    );

    this.app.action(
      "home_start_standup",
      async ({ack, body, client}) => {
        await ack();

        try {
          await client.views.open({
            trigger_id: (body as any).trigger_id,
            view: this.slackUIService.buildQuickStandupModal(),
          });
        } catch (error) {
          console.error("Error opening standup modal:", error);
        }
      }
    );

    this.app.action(
      "home_checkin",
      async ({ack, body, client}) => {
        await ack();

        try {
          await client.views.open({
            trigger_id: (body as any).trigger_id,
            view: this.slackUIService.buildQuickStandupModal(),
          });
        } catch (error) {
          console.error("Error opening checkin modal:", error);
        }
      }
    );
  }

  /**
   * Get Express app for Firebase Functions.
   * @return {Express} Express app instance
   */
  getExpressApp() {
    return this.receiver.app;
  }

  /**
   * Start the bot (for local development).
   * @param {number} port - Port number
   */
  async start(port = 3000) {
    await this.app.start(port);
    console.log(`⚡️ Bot running on port ${port}`);
  }
}
