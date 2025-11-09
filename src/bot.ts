/**
 * Check-In Bot
 * Main bot implementation with command handlers
 */

import { App, ExpressReceiver } from '@slack/bolt';
import { CheckInRecord, TaskEntryFormData } from './models/types';
import { FirebaseService } from './services/firebase.service';
import { SlackUIService } from './services/slack-ui.service';
import { StandupFlowService } from './services/standup-flow.service';

export class CheckInBot {
  private app: App;
  private receiver: ExpressReceiver;
  private firebaseService: FirebaseService;
  private slackUIService: SlackUIService;
  private standupFlowService: StandupFlowService;

  constructor() {
    // Validate environment variables
    if (!process.env.SLACK_SIGNING_SECRET) {
      throw new Error('SLACK_SIGNING_SECRET is required');
    }
    if (!process.env.SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN is required');
    }

    // Initialize services
    this.firebaseService = new FirebaseService();
    this.slackUIService = new SlackUIService();
    this.standupFlowService = new StandupFlowService(
      this.firebaseService,
      this.slackUIService
    );

    // Set up Slack app with ExpressReceiver
    this.receiver = new ExpressReceiver({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      processBeforeResponse: true,
      endpoints: '/', // Change from default '/slack/events' to root '/'
    });

    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      receiver: this.receiver,
    });

    this.registerCommands();
    this.registerActions();
    this.registerViewSubmissions();

    // Cleanup old standup states every 30 minutes
    // Note: This won't work well in Cloud Functions (stateless)
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => {
        this.standupFlowService.cleanupOldStates(60);
      }, 30 * 60 * 1000);
    }
  }

  /**
   * Register slash commands
   */
  private registerCommands(): void {
    // /checkin command
    this.app.command('/checkin', async ({ command, ack, client, respond }) => {
      await ack();

      try {
        const userId = command.user_id;
        const userName = command.user_name;

        // Check if already checked in
        const isCheckedIn = await this.firebaseService.isUserCheckedIn(userId);

        if (isCheckedIn) {
          await respond({
            text: '⚠️ You are already checked in!',
            response_type: 'ephemeral',
          });
          return;
        }

        // Get user info
        const userInfo = await client.users.info({ user: userId });
        const userEmail = userInfo.user?.profile?.email || '';

        // Save check-in
        const checkInData: CheckInRecord = {
          userId,
          userName,
          userEmail,
          type: 'checkin',
          timestamp: new Date(),
        };

        await this.firebaseService.saveCheckIn(checkInData);

        // Get bot config
        const config = await this.firebaseService.getBotConfig();

        if (config.requireStandupOnCheckIn) {
          // Start standup flow
          await this.standupFlowService.startStandupFlow(
            client,
            command.trigger_id,
            userId,
            userName
          );
        } else {
          // Just confirm check-in
          const time = new Date().toLocaleTimeString();
          await respond({
            text: this.slackUIService.buildCheckInMessage(userName, 'checkin', time),
            response_type: 'ephemeral',
          });
        }
      } catch (error) {
        console.error('Error handling /checkin:', error);
        await respond({
          text: '❌ Error processing check-in. Please try again.',
          response_type: 'ephemeral',
        });
      }
    });

    // /checkout command
    this.app.command('/checkout', async ({ command, ack, client, respond }) => {
      await ack();

      try {
        const userId = command.user_id;
        const userName = command.user_name;

        // Check if checked in
        const isCheckedIn = await this.firebaseService.isUserCheckedIn(userId);

        if (!isCheckedIn) {
          await respond({
            text: '⚠️ You are not checked in yet!',
            response_type: 'ephemeral',
          });
          return;
        }

        // Get user info
        const userInfo = await client.users.info({ user: userId });
        const userEmail = userInfo.user?.profile?.email || '';

        // Save check-out
        const checkOutData: CheckInRecord = {
          userId,
          userName,
          userEmail,
          type: 'checkout',
          timestamp: new Date(),
        };

        await this.firebaseService.saveCheckIn(checkOutData);

        const time = new Date().toLocaleTimeString();
        await respond({
          text: this.slackUIService.buildCheckInMessage(userName, 'checkout', time),
          response_type: 'ephemeral',
        });
      } catch (error) {
        console.error('Error handling /checkout:', error);
        await respond({
          text: '❌ Error processing check-out. Please try again.',
          response_type: 'ephemeral',
        });
      }
    });

    // /standup command
    this.app.command('/standup', async ({ command, ack, client, respond }) => {
      await ack();

      try {
        const userId = command.user_id;
        const userName = command.user_name;

        // Check if already has active flow
        if (this.standupFlowService.hasActiveFlow(userId)) {
          await respond({
            text: '⚠️ You already have an active standup in progress!',
            response_type: 'ephemeral',
          });
          return;
        }

        // Start standup flow
        await this.standupFlowService.startStandupFlow(
          client,
          command.trigger_id,
          userId,
          userName
        );
      } catch (error) {
        console.error('Error handling /standup:', error);
        await respond({
          text: '❌ Error starting standup. Please try again.',
          response_type: 'ephemeral',
        });
      }
    });

    // /status command
    this.app.command('/status', async ({ command, ack, client, respond }) => {
      await ack();

      try {
        const userId = command.user_id;
        const userName = command.user_name;

        const isCheckedIn = await this.firebaseService.isUserCheckedIn(userId);
        const lastCheckIn = await this.firebaseService.getLastCheckIn(userId);
        const stats = await this.firebaseService.getUserStats(userId, 30);

        await respond({
          blocks: this.slackUIService.buildStatusMessage(
            userName,
            isCheckedIn,
            lastCheckIn?.timestamp || null,
            stats
          ),
          response_type: 'ephemeral',
        });
      } catch (error) {
        console.error('Error handling /status:', error);
        await respond({
          text: '❌ Error getting status. Please try again.',
          response_type: 'ephemeral',
        });
      }
    });
  }

  /**
   * Register action handlers
   */
  private registerActions(): void {
    // Handle feeling selection (not needed as we get it on submit)
    // But we keep this for potential real-time validation
  }

  /**
   * Register view submission handlers
   */
  private registerViewSubmissions(): void {
    // Handle feeling submission
    this.app.view('standup_feeling_submit', async ({ ack, view, body, client }) => {
      await ack();

      try {
        const userId = body.user.id;
        const values = view.state.values;

        // Extract feeling
        const feeling = values.feeling_selection?.feeling?.selected_option?.value;

        if (!feeling) {
          console.error('No feeling selected');
          return;
        }

        // Handle feeling submit
        await this.standupFlowService.handleFeelingSubmit(
          client,
          userId,
          feeling as any,
          view.id
        );
      } catch (error) {
        console.error('Error handling feeling submit:', error);
      }
    });

    // Handle yesterday task entry
    this.app.view('task_entry_yesterday', async ({ ack, view, body, client }) => {
      // Check if it's "Add Another" (submit) or "Done" (close)
      const isAddAnother = body.type === 'view_submission';

      if (isAddAnother) {
        await ack();
      } else {
        // "Done" clicked - move to next step by updating the view
        await ack();
        try {
          const config = await this.firebaseService.getBotConfig();

          // Update the current view to show today's tasks
          await client.views.update({
            view_id: view.id,
            view: this.slackUIService.buildTaskEntryView('today', config.projects),
          });
        } catch (error) {
          console.error('Error moving to today tasks:', error);
        }
        return;
      }

      try {
        const userId = body.user.id;
        const values = view.state.values;

        // Extract task data
        const taskData: TaskEntryFormData = {
          project: values.project?.project_select?.selected_option?.value || '',
          ticketNumber: values.ticket_number?.ticket_input?.value || 'N/A',
          taskTitle: values.task_title?.title_input?.value || '',
          estimatedTime: values.estimated_time?.time_select?.selected_option?.value as any,
          confidenceScore: values.confidence_score?.confidence_select?.selected_option?.value || '3',
          difficultyLevel: values.difficulty_level?.difficulty_select?.selected_option?.value || '3',
        };

        // Handle task submit
        await this.standupFlowService.handleTaskSubmit(
          client,
          userId,
          'yesterday',
          taskData,
          view.id,
          true // Add another
        );
      } catch (error) {
        console.error('Error handling yesterday task submit:', error);
      }
    });

    // Handle today task entry
    this.app.view('task_entry_today', async ({ ack, view, body, client }) => {
      const isAddAnother = body.type === 'view_submission';

      if (isAddAnother) {
        await ack();
      } else {
        // "Done" clicked - move to blockers by updating the view
        await ack();
        try {
          const userId = body.user.id;
          const state = this.standupFlowService.getStandupState(userId);

          if (state) {
            await client.views.update({
              view_id: view.id,
              view: this.slackUIService.buildBlockersView(state.yesterday, state.today),
            });
          }
        } catch (error) {
          console.error('Error moving to blockers:', error);
        }
        return;
      }

      try {
        const userId = body.user.id;
        const values = view.state.values;

        // Extract task data
        const taskData: TaskEntryFormData = {
          project: values.project?.project_select?.selected_option?.value || '',
          ticketNumber: values.ticket_number?.ticket_input?.value || 'N/A',
          taskTitle: values.task_title?.title_input?.value || '',
          estimatedTime: values.estimated_time?.time_select?.selected_option?.value as any,
          confidenceScore: values.confidence_score?.confidence_select?.selected_option?.value || '3',
          difficultyLevel: values.difficulty_level?.difficulty_select?.selected_option?.value || '3',
        };

        // Handle task submit
        await this.standupFlowService.handleTaskSubmit(
          client,
          userId,
          'today',
          taskData,
          view.id,
          true // Add another
        );
      } catch (error) {
        console.error('Error handling today task submit:', error);
      }
    });

    // Handle blockers submission
    this.app.view('blockers_submit', async ({ ack, view, body, client }) => {
      await ack();

      try {
        const userId = body.user.id;
        const values = view.state.values;

        // Extract blockers
        const blockers = values.blockers?.blockers_input?.value || '';

        // Complete standup
        const standupData = await this.standupFlowService.handleBlockersSubmit(
          client,
          userId,
          blockers
        );

        // Send confirmation message
        await client.chat.postMessage({
          channel: userId,
          text: `✅ Your standup for ${standupData.date} has been submitted successfully!`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `✅ *Standup submitted!*\n\n📅 Date: ${standupData.date}\n📊 Yesterday: ${standupData.yesterday.length} task(s)\n📋 Today: ${standupData.today.length} task(s)`,
              },
            },
          ],
        });
      } catch (error) {
        console.error('Error handling blockers submit:', error);
      }
    });
  }

  /**
   * Get Express app for Firebase Functions
   */
  getExpressApp() {
    return this.receiver.app;
  }

  /**
   * Start the bot (for local development)
   */
  async start(port: number = 3000) {
    await this.app.start(port);
    console.log(`⚡️ Check-in bot is running on port ${port}`);
  }
}