/**
 * Check-In Bot
 * Main bot implementation with command handlers
 */

import { App, ExpressReceiver } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { CheckInRecord, FeelingType, StandupData, TaskEntry, TaskEntryFormData } from './models/types';
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
      endpoints: '/',
    });

    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      receiver: this.receiver,
    });

    this.registerCommands();
    this.registerActions();
    this.registerViewSubmissions();
    this.registerAppHome(); // Add App Home handlers

    // Cleanup old standup states every 30 minutes
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
    // Handle the standup trigger button after checkin
    this.app.action('trigger_standup_after_checkin', async ({ ack, body, client }) => {
      await ack();

      try {
        const userId = body.user.id;
        const config = await this.firebaseService.getBotConfig();

        await client.views.open({
          trigger_id: (body as any).trigger_id,
          view: this.slackUIService.buildQuickStandupModal(config.projects),
        });
      } catch (error) {
        console.error('Error opening standup modal:', error);
      }
    });
  }

  /**
   * Register view submission handlers
   */
  private registerViewSubmissions(): void {
    // Handle feeling submission
    this.app.view('standup_feeling_submit', async ({ ack, view, body, client }) => {
      const userId = body.user.id;
      const values = view.state.values;
      const feeling = values.feeling_selection?.feeling?.selected_option?.value;

      if (!feeling) {
        await ack({
          response_action: 'errors',
          errors: {
            feeling_selection: 'Please select how you are feeling',
          },
        });
        return;
      }

      try {
        const config = await this.firebaseService.getBotConfig();

        await ack({
          response_action: 'update',
          view: this.slackUIService.buildTaskEntryView('yesterday', config.projects),
        });

        await this.standupFlowService.handleFeelingSubmit(
          client,
          userId,
          feeling as any,
          view.id
        );
      } catch (error) {
        console.error('Error handling feeling submit:', error);
        await ack({
          response_action: 'errors',
          errors: {
            feeling_selection: 'An error occurred. Please try again.',
          },
        });
      }
    });

    // Handle yesterday task entry
    this.app.view('task_entry_yesterday', async ({ ack, view, body, client }) => {
      const isAddAnother = body.type === 'view_submission';

      if (isAddAnother) {
        await ack();
      } else {
        await ack();
        try {
          const config = await this.firebaseService.getBotConfig();
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

        const taskData: TaskEntryFormData = {
          project: values.project?.project_select?.selected_option?.value || '',
          ticketNumber: values.ticket_number?.ticket_input?.value || 'N/A',
          taskTitle: values.task_title?.title_input?.value || '',
          estimatedTime: values.estimated_time?.time_select?.selected_option?.value as any,
          confidenceScore: values.confidence_score?.confidence_select?.selected_option?.value || '3',
          difficultyLevel: values.difficulty_level?.difficulty_select?.selected_option?.value || '3',
        };

        await this.standupFlowService.handleTaskSubmit(
          client,
          userId,
          'yesterday',
          taskData,
          view.id,
          true
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

        const taskData: TaskEntryFormData = {
          project: values.project?.project_select?.selected_option?.value || '',
          ticketNumber: values.ticket_number?.ticket_input?.value || 'N/A',
          taskTitle: values.task_title?.title_input?.value || '',
          estimatedTime: values.estimated_time?.time_select?.selected_option?.value as any,
          confidenceScore: values.confidence_score?.confidence_select?.selected_option?.value || '3',
          difficultyLevel: values.difficulty_level?.difficulty_select?.selected_option?.value || '3',
        };

        await this.standupFlowService.handleTaskSubmit(
          client,
          userId,
          'today',
          taskData,
          view.id,
          true
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
        const blockers = values.blockers?.blockers_input?.value || '';

        const standupData = await this.standupFlowService.handleBlockersSubmit(
          client,
          userId,
          blockers
        );

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

        // Refresh home view
        await this.refreshHomeView(client, userId);
      } catch (error) {
        console.error('Error handling blockers submit:', error);
      }
    });

    // Handle check-in modal submission
    this.app.view('checkin_modal_submit', async ({ ack, view, body, client }) => {
      await ack();

      try {
        const userId = body.user.id;
        const userInfo = await client.users.info({ user: userId });
        const userName = userInfo.user?.real_name || userInfo.user?.name || 'User';
        const userEmail = userInfo.user?.profile?.email || '';

        const values = view.state.values;
        const submitStandup = values.checkin_options?.options_select?.selected_options?.some(
          (opt: any) => opt.value === 'submit_standup'
        );
        const note = values.checkin_note?.note_input?.value || '';

        const checkInData: CheckInRecord = {
          userId,
          userName,
          userEmail,
          type: 'checkin',
          timestamp: new Date(),
        };
        await this.firebaseService.saveCheckIn(checkInData);

        const time = new Date().toLocaleTimeString();
        await client.chat.postMessage({
          channel: userId,
          text: `✅ Checked in at ${time}${note ? `\nNote: ${note}` : ''}`,
        });

        if (submitStandup) {
          setTimeout(async () => {
            await client.chat.postMessage({
              channel: userId,
              text: 'Ready to submit your standup?',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: '📝 *Ready to submit your standup?*',
                  },
                },
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: {
                        type: 'plain_text',
                        text: 'Submit Standup Now',
                      },
                      style: 'primary',
                      action_id: 'trigger_standup_after_checkin',
                    },
                  ],
                },
              ],
            });
          }, 500);
        }

        await this.refreshHomeView(client, userId);
      } catch (error) {
        console.error('Error handling check-in modal:', error);
      }
    });

    // Handle check-out modal submission
    this.app.view('checkout_modal_submit', async ({ ack, view, body, client }) => {
      await ack();

      try {
        const userId = body.user.id;
        const userInfo = await client.users.info({ user: userId });
        const userName = userInfo.user?.real_name || userInfo.user?.name || 'User';
        const userEmail = userInfo.user?.profile?.email || '';

        const values = view.state.values;
        const note = values.checkout_note?.note_input?.value || '';

        const checkOutData: CheckInRecord = {
          userId,
          userName,
          userEmail,
          type: 'checkout',
          timestamp: new Date(),
        };
        await this.firebaseService.saveCheckIn(checkOutData);

        const time = new Date().toLocaleTimeString();
        await client.chat.postMessage({
          channel: userId,
          text: `👋 Checked out at ${time}${note ? `\nNote: ${note}` : ''}`,
        });

        await this.refreshHomeView(client, userId);
      } catch (error) {
        console.error('Error handling check-out modal:', error);
      }
    });

    // Handle quick standup submission
    this.app.view('quick_standup_submit', async ({ ack, view, body, client }) => {
      await ack();

      try {
        const userId = body.user.id;
        const userInfo = await client.users.info({ user: userId });
        const userName = userInfo.user?.real_name || userInfo.user?.name || 'User';

        const values = view.state.values;

        const feeling = values.feeling_selection?.feeling?.selected_option?.value as FeelingType;
        const project = values.project_select?.project?.selected_option?.value || '';
        const yesterdaySummary = values.yesterday_summary?.summary_input?.value || '';
        const todayPlan = values.today_plan?.plan_input?.value || '';
        const blockers = values.blockers?.blockers_input?.value || '';

        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        const yesterdayTasks: TaskEntry[] = yesterdaySummary ? [{
          project,
          ticketNumber: 'N/A',
          taskTitle: yesterdaySummary,
          estimatedTime: '2-3h',
          confidenceScore: 3,
          difficultyLevel: 3,
        }] : [];

        const todayTasks: TaskEntry[] = todayPlan ? [{
          project,
          ticketNumber: 'N/A',
          taskTitle: todayPlan,
          estimatedTime: '2-3h',
          confidenceScore: 3,
          difficultyLevel: 3,
        }] : [];

        const standupData: StandupData = {
          userId,
          userName,
          feeling,
          yesterday: yesterdayTasks,
          today: todayTasks,
          blockers,
          date: dateStr,
          timestamp: new Date(),
        };

        await this.firebaseService.saveStandup(standupData);

        const projectChannel = await this.firebaseService.getProjectChannel(project);
        if (projectChannel) {
          await client.chat.postMessage({
            channel: projectChannel.channelId,
            blocks: this.slackUIService.buildStandupSummaryMessage(standupData),
            text: `${userName}'s daily standup for ${dateStr}`,
          });
        }

        await client.chat.postMessage({
          channel: userId,
          text: `✅ Your standup for ${dateStr} has been submitted!`,
        });

        await this.refreshHomeView(client, userId);
      } catch (error) {
        console.error('Error handling quick standup:', error);
      }
    });
  }

  /**
   * Register app home handlers
   */
  private registerAppHome(): void {
    // Handle app home opened event
    this.app.event('app_home_opened', async ({ event, client }) => {
      try {
        const userId = event.user;

        const userInfo = await client.users.info({ user: userId });
        const userName = userInfo.user?.real_name || userInfo.user?.name || 'User';

        const isCheckedIn = await this.firebaseService.isUserCheckedIn(userId);
        const lastCheckIn = await this.firebaseService.getLastCheckIn(userId);
        const stats = await this.firebaseService.getUserStats(userId, 30);

        const today = new Date().toISOString().split('T')[0];
        const todayStandup = await this.firebaseService.getStandupByDate(userId, today);

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
        console.error('Error publishing home view:', error);
      }
    });

    // Handle home check-in button - OPEN MODAL
    this.app.action('home_checkin', async ({ ack, body, client }) => {
      await ack();

      try {
        const userId = body.user.id;

        const isCheckedIn = await this.firebaseService.isUserCheckedIn(userId);
        if (isCheckedIn) {
          await this.refreshHomeView(client, userId);
          return;
        }

        await client.views.open({
          trigger_id: (body as any).trigger_id,
          view: this.slackUIService.buildCheckInModal(),
        });
      } catch (error) {
        console.error('Error opening check-in modal:', error);
      }
    });

    // Handle home check-out button - OPEN MODAL
    this.app.action('home_checkout', async ({ ack, body, client }) => {
      await ack();

      try {
        const userId = body.user.id;

        const isCheckedIn = await this.firebaseService.isUserCheckedIn(userId);
        if (!isCheckedIn) {
          await this.refreshHomeView(client, userId);
          return;
        }

        await client.views.open({
          trigger_id: (body as any).trigger_id,
          view: this.slackUIService.buildCheckOutModal(),
        });
      } catch (error) {
        console.error('Error opening check-out modal:', error);
      }
    });

    // Handle home standup button - OPEN MODAL
    this.app.action('home_start_standup', async ({ ack, body, client }) => {
      await ack();

      try {
        const userId = body.user.id;

        if (this.standupFlowService.hasActiveFlow(userId)) {
          return;
        }

        const config = await this.firebaseService.getBotConfig();

        await client.views.open({
          trigger_id: (body as any).trigger_id,
          view: this.slackUIService.buildQuickStandupModal(config.projects),
        });
      } catch (error) {
        console.error('Error starting standup from home:', error);
      }
    });
  }

  /**
   * Helper to refresh home view
   */
  private async refreshHomeView(client: WebClient, userId: string): Promise<void> {
    try {
      const userInfo = await client.users.info({ user: userId });
      const userName = userInfo.user?.real_name || userInfo.user?.name || 'User';

      const isCheckedIn = await this.firebaseService.isUserCheckedIn(userId);
      const lastCheckIn = await this.firebaseService.getLastCheckIn(userId);
      const stats = await this.firebaseService.getUserStats(userId, 30);

      const today = new Date().toISOString().split('T')[0];
      const todayStandup = await this.firebaseService.getStandupByDate(userId, today);

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
      console.error('Error refreshing home view:', error);
    }
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