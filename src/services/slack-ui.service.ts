/**
 * Slack UI Service
 * Builds all Slack interactive components (modals, messages, blocks)
 */

import { Block, KnownBlock, View } from '@slack/web-api';
import {
  CheckInRecord,
  FeelingType,
  StandupData,
  TaskEntry
} from '../models/types';

export class SlackUIService {

  /**
 * Build the App Home view with action buttons
 */
  buildAppHomeView(
    userName: string,
    isCheckedIn: boolean,
    lastCheckIn: CheckInRecord | null,
    stats: any,
    todayStandup: StandupData | null
  ): View {
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const blocks: (Block | KnownBlock)[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `👋 Welcome, ${userName}!`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🕐 Current time: *${currentTime}*`,
        },
      },
      {
        type: 'divider',
      },
    ];

    // Status Section
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: isCheckedIn
          ? '✅ *Status: Checked In*\nYou are currently active.'
          : '⏸️ *Status: Checked Out*\nStart your day by checking in!',
      },
    });

    if (lastCheckIn) {
      const lastTime = lastCheckIn.timestamp.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Last activity: ${lastCheckIn.type === 'checkin' ? 'Checked in' : 'Checked out'} at ${lastTime}`,
          },
        ],
      });
    }

    blocks.push({
      type: 'divider',
    });

    // Quick Actions Section
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*⚡ Quick Actions*',
      },
    });

    // Check-in/Check-out button
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: isCheckedIn ? '👋 Check Out' : '👋 Check In',
            emoji: true,
          },
          style: isCheckedIn ? undefined : 'primary',
          action_id: isCheckedIn ? 'home_checkout' : 'home_checkin',
          value: 'toggle_checkin',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📝 Submit Standup',
            emoji: true,
          },
          style: todayStandup ? undefined : 'primary',
          action_id: 'home_start_standup',
          value: 'start_standup',
        },
      ],
    });

    blocks.push({
      type: 'divider',
    });

    // Standup Status
    const today = new Date().toISOString().split('T')[0];
    if (todayStandup) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Today's Standup Completed*\n📊 Yesterday: ${todayStandup.yesterday.length} task(s)\n📋 Today: ${todayStandup.today.length} task(s)\n${todayStandup.blockers ? `🚧 Has blockers` : ''}`,
        },
      });
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⏰ *Today's Standup: Not submitted*\nClick "Submit Standup" to share your daily update.`,
        },
      });
    }

    blocks.push({
      type: 'divider',
    });

    // Stats Section
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*📊 Your Stats (Last 30 Days)*',
      },
    });

    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Check-ins*\n${stats?.totalCheckIns || 0}`,
        },
        {
          type: 'mrkdwn',
          text: `*Check-outs*\n${stats?.totalCheckOuts || 0}`,
        },
      ],
    });

    return {
      type: 'home',
      blocks,
    };
  }

  /**
 * Build Check-in Modal with options
 */
  buildCheckInModal(): View {
    return {
      type: 'modal',
      callback_id: 'checkin_modal_submit',
      title: {
        type: 'plain_text',
        text: 'Check In',
      },
      submit: {
        type: 'plain_text',
        text: 'Check In',
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '👋 *Ready to start your day?*\n\nCheck in to mark your presence and optionally submit your daily standup.',
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'input',
          block_id: 'checkin_options',
          element: {
            type: 'checkboxes',
            action_id: 'options_select',
            options: [
              {
                text: {
                  type: 'mrkdwn',
                  text: '*Submit standup now*\nI want to share my daily update right away',
                },
                value: 'submit_standup',
              },
            ],
          },
          label: {
            type: 'plain_text',
            text: 'Options',
          },
          optional: true,
        },
        {
          type: 'input',
          block_id: 'checkin_note',
          element: {
            type: 'plain_text_input',
            action_id: 'note_input',
            placeholder: {
              type: 'plain_text',
              text: 'Add a note (optional)',
            },
            multiline: true,
          },
          label: {
            type: 'plain_text',
            text: 'Note',
          },
          optional: true,
        },
      ],
    };
  }

  /**
   * Build Check-out Modal
   */
  buildCheckOutModal(): View {
    return {
      type: 'modal',
      callback_id: 'checkout_modal_submit',
      title: {
        type: 'plain_text',
        text: 'Check Out',
      },
      submit: {
        type: 'plain_text',
        text: 'Check Out',
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '👋 *Ready to wrap up your day?*\n\nCheck out to mark the end of your workday.',
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'input',
          block_id: 'checkout_note',
          element: {
            type: 'plain_text_input',
            action_id: 'note_input',
            placeholder: {
              type: 'plain_text',
              text: 'Add a note about your day (optional)',
            },
            multiline: true,
          },
          label: {
            type: 'plain_text',
            text: 'Note',
          },
          optional: true,
        },
      ],
    };
  }

  /**
   * Build Quick Standup Modal (simplified one-page version)
   */
  buildQuickStandupModal(projects: string[]): View {
    return {
      type: 'modal',
      callback_id: 'quick_standup_submit',
      title: {
        type: 'plain_text',
        text: 'Quick Standup',
      },
      submit: {
        type: 'plain_text',
        text: 'Submit',
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '📝 *Quick Daily Update*\n\nShare a brief update about your work.',
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'input',
          block_id: 'feeling_selection',
          element: {
            type: 'static_select',
            action_id: 'feeling',
            placeholder: {
              type: 'plain_text',
              text: 'How are you feeling?',
            },
            options: [
              {
                text: { type: 'plain_text', text: '😄 Great', emoji: true },
                value: 'great',
              },
              {
                text: { type: 'plain_text', text: '🙂 Good', emoji: true },
                value: 'good',
              },
              {
                text: { type: 'plain_text', text: '😐 Okay', emoji: true },
                value: 'okay',
              },
              {
                text: { type: 'plain_text', text: '😓 Tired', emoji: true },
                value: 'tired',
              },
              {
                text: { type: 'plain_text', text: '😰 Stressed', emoji: true },
                value: 'stressed',
              },
            ],
          },
          label: {
            type: 'plain_text',
            text: 'Feeling',
          },
        },
        {
          type: 'input',
          block_id: 'project_select',
          element: {
            type: 'static_select',
            action_id: 'project',
            placeholder: {
              type: 'plain_text',
              text: 'Select project',
            },
            options: projects.map((proj) => ({
              text: { type: 'plain_text', text: proj },
              value: proj,
            })),
          },
          label: {
            type: 'plain_text',
            text: 'Primary Project',
          },
        },
        {
          type: 'input',
          block_id: 'yesterday_summary',
          element: {
            type: 'plain_text_input',
            action_id: 'summary_input',
            placeholder: {
              type: 'plain_text',
              text: 'What did you accomplish yesterday?',
            },
            multiline: true,
          },
          label: {
            type: 'plain_text',
            text: "Yesterday's Work",
          },
        },
        {
          type: 'input',
          block_id: 'today_plan',
          element: {
            type: 'plain_text_input',
            action_id: 'plan_input',
            placeholder: {
              type: 'plain_text',
              text: 'What are you working on today?',
            },
            multiline: true,
          },
          label: {
            type: 'plain_text',
            text: "Today's Plan",
          },
        },
        {
          type: 'input',
          block_id: 'blockers',
          element: {
            type: 'plain_text_input',
            action_id: 'blockers_input',
            placeholder: {
              type: 'plain_text',
              text: 'Any blockers or challenges?',
            },
            multiline: true,
          },
          label: {
            type: 'plain_text',
            text: 'Blockers',
          },
          optional: true,
        },
      ],
    };
  }

  /**
 * Build the standup feeling selection view (Step 1)
 */
  buildStandupFeelingView(): View {
    return {
      type: 'modal',
      callback_id: 'standup_feeling_submit',
      title: {
        type: 'plain_text',
        text: 'Daily Standup',
      },
      submit: {
        type: 'plain_text',
        text: 'Next',
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*How are you feeling today?* 😊',
          },
        },
        {
          type: 'input',
          block_id: 'feeling_selection',
          element: {
            type: 'radio_buttons',
            action_id: 'feeling',
            options: [
              {
                text: { type: 'plain_text', text: '😄 Great' },
                value: 'great',
              },
              {
                text: { type: 'plain_text', text: '🙂 Good' },
                value: 'good',
              },
              {
                text: { type: 'plain_text', text: '😐 Okay' },
                value: 'okay',
              },
              {
                text: { type: 'plain_text', text: '😓 Tired' },
                value: 'tired',
              },
              {
                text: { type: 'plain_text', text: '😰 Stressed' },
                value: 'stressed',
              },
            ],
          },
          label: {
            type: 'plain_text',
            text: 'Select your mood',
          },
        },
      ],
    };
  }

  /**
   * Build task entry modal for adding yesterday/today tasks
   */
  buildTaskEntryView(
    type: 'yesterday' | 'today',
    projects: string[],
    existingTasks: TaskEntry[] = []
  ): View {
    const title = type === 'yesterday' ? 'What did you do yesterday?' : 'What are you doing today?';

    return {
      type: 'modal',
      callback_id: `task_entry_${type}`,
      title: {
        type: 'plain_text',
        text: title,
      },
      submit: {
        type: 'plain_text',
        text: existingTasks.length > 0 ? 'Add Another' : 'Add Task',
      },
      close: {
        type: 'plain_text',
        text: existingTasks.length > 0 ? 'Done' : 'Skip',
      },
      private_metadata: JSON.stringify({ type, existingTasks }),
      blocks: [
        // Show existing tasks if any
        ...(existingTasks.length > 0
          ? [
            {
              type: 'section' as const,
              text: {
                type: 'mrkdwn' as const,
                text: `*Tasks added (${existingTasks.length}):*\n${existingTasks
                  .map((task, i) => `${i + 1}. ${task.taskTitle} - ${task.project}`)
                  .join('\n')}`,
              },
            },
            { type: 'divider' as const },
          ]
          : []),
        {
          type: 'input',
          block_id: 'project',
          element: {
            type: 'static_select',
            action_id: 'project_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select a project',
            },
            options: projects.map((proj) => ({
              text: { type: 'plain_text' as const, text: proj },
              value: proj,
            })),
          },
          label: {
            type: 'plain_text',
            text: 'Project',
          },
        },
        {
          type: 'input',
          block_id: 'ticket_number',
          element: {
            type: 'plain_text_input',
            action_id: 'ticket_input',
            placeholder: {
              type: 'plain_text',
              text: 'Enter ticket number or N/A',
            },
          },
          label: {
            type: 'plain_text',
            text: 'Ticket Number',
          },
        },
        {
          type: 'input',
          block_id: 'task_title',
          element: {
            type: 'plain_text_input',
            action_id: 'title_input',
            placeholder: {
              type: 'plain_text',
              text: 'Enter task description',
            },
            multiline: true,
          },
          label: {
            type: 'plain_text',
            text: 'Task Title',
          },
        },
        {
          type: 'input',
          block_id: 'estimated_time',
          element: {
            type: 'static_select',
            action_id: 'time_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select estimated time',
            },
            options: [
              { text: { type: 'plain_text', text: '1-2 hours' }, value: '1-2h' },
              { text: { type: 'plain_text', text: '2-3 hours' }, value: '2-3h' },
              { text: { type: 'plain_text', text: '3-4 hours' }, value: '3-4h' },
              { text: { type: 'plain_text', text: '4+ hours' }, value: '4h+' },
            ],
          },
          label: {
            type: 'plain_text',
            text: 'Estimated Time',
          },
        },
        {
          type: 'section',
          block_id: 'confidence_score',
          text: {
            type: 'mrkdwn',
            text: '*Confidence Score* ⭐ (1 = Low, 5 = High)',
          },
          accessory: {
            type: 'static_select',
            action_id: 'confidence_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select confidence',
            },
            options: [
              { text: { type: 'plain_text', text: '⭐ 1' }, value: '1' },
              { text: { type: 'plain_text', text: '⭐⭐ 2' }, value: '2' },
              { text: { type: 'plain_text', text: '⭐⭐⭐ 3' }, value: '3' },
              { text: { type: 'plain_text', text: '⭐⭐⭐⭐ 4' }, value: '4' },
              { text: { type: 'plain_text', text: '⭐⭐⭐⭐⭐ 5' }, value: '5' },
            ],
          },
        },
        {
          type: 'section',
          block_id: 'difficulty_level',
          text: {
            type: 'mrkdwn',
            text: '*Difficulty Level* 🔥 (1 = Easy, 5 = Hard)',
          },
          accessory: {
            type: 'static_select',
            action_id: 'difficulty_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select difficulty',
            },
            options: [
              { text: { type: 'plain_text', text: '🔥 1' }, value: '1' },
              { text: { type: 'plain_text', text: '🔥🔥 2' }, value: '2' },
              { text: { type: 'plain_text', text: '🔥🔥🔥 3' }, value: '3' },
              { text: { type: 'plain_text', text: '🔥🔥🔥🔥 4' }, value: '4' },
              { text: { type: 'plain_text', text: '🔥🔥🔥🔥🔥 5' }, value: '5' },
            ],
          },
        },
      ],
    };
  }

  /**
   * Build blockers input view (Final step)
   */
  buildBlockersView(yesterdayTasks: TaskEntry[], todayTasks: TaskEntry[]): View {
    return {
      type: 'modal',
      callback_id: 'blockers_submit',
      title: {
        type: 'plain_text',
        text: 'Any Blockers?',
      },
      submit: {
        type: 'plain_text',
        text: 'Submit',
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      private_metadata: JSON.stringify({ yesterdayTasks, todayTasks }),
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Yesterday:* ${yesterdayTasks.length} task(s)\n✅ *Today:* ${todayTasks.length} task(s)`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'input',
          block_id: 'blockers',
          optional: true,
          element: {
            type: 'plain_text_input',
            action_id: 'blockers_input',
            placeholder: {
              type: 'plain_text',
              text: 'Describe any blockers or challenges (optional)',
            },
            multiline: true,
          },
          label: {
            type: 'plain_text',
            text: 'Blockers / Challenges',
          },
        },
      ],
    };
  }

  /**
   * Build standup summary message for posting to project channels
   */
  buildStandupSummaryMessage(standup: StandupData): (Block | KnownBlock)[] {
    const feelingEmoji = this.getFeelingEmoji(standup.feeling);

    const blocks: (Block | KnownBlock)[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${feelingEmoji} ${standup.userName}'s Daily Update`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📅 ${standup.date} | Feeling: *${standup.feeling}*`,
          },
        ],
      },
      {
        type: 'divider',
      },
    ];

    // Yesterday's tasks
    if (standup.yesterday.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*✅ Yesterday:*',
        },
      });

      standup.yesterday.forEach((task, i) => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: this.formatTask(task, i + 1),
          },
        });
      });
    }

    // Today's tasks
    if (standup.today.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*📋 Today:*',
        },
      });

      standup.today.forEach((task, i) => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: this.formatTask(task, i + 1),
          },
        });
      });
    }

    // Blockers
    if (standup.blockers && standup.blockers.trim()) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🚧 Blockers:*\n${standup.blockers}`,
        },
      });
    }

    return blocks;
  }

  /**
   * Build simple check-in/check-out confirmation message
   */
  buildCheckInMessage(userName: string, type: 'checkin' | 'checkout', time: string): string {
    if (type === 'checkin') {
      return `✅ Welcome ${userName}! You checked in at ${time}`;
    } else {
      return `👋 See you tomorrow ${userName}! You checked out at ${time}`;
    }
  }

  /**
   * Build status message
   */
  buildStatusMessage(
    userName: string,
    isCheckedIn: boolean,
    lastCheckIn: Date | null,
    stats: any
  ): (Block | KnownBlock)[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${userName}'s Status`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Current Status:*\n${isCheckedIn ? '✅ Checked In' : '⏸️ Checked Out'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Last Activity:*\n${lastCheckIn ? lastCheckIn.toLocaleString() : 'N/A'}`,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Last 30 Days:*\n• Check-ins: ${stats?.totalCheckIns || 0}\n• Check-outs: ${stats?.totalCheckOuts || 0}`,
        },
      },
    ];
  }

  /**
   * Format a task for display
   */
  private formatTask(task: TaskEntry, index: number): string {
    const stars = '⭐'.repeat(task.confidenceScore);
    const flames = '🔥'.repeat(task.difficultyLevel);

    return (
      `*${index}. ${task.taskTitle}*\n` +
      `   Project: ${task.project} | Ticket: ${task.ticketNumber}\n` +
      `   Time: ${task.estimatedTime} | Confidence: ${stars} | Difficulty: ${flames}`
    );
  }

  /**
   * Get emoji for feeling type
   */
  private getFeelingEmoji(feeling: FeelingType): string {
    const emojiMap: Record<FeelingType, string> = {
      great: '😄',
      good: '🙂',
      okay: '😐',
      tired: '😓',
      stressed: '😰',
    };
    return emojiMap[feeling] || '🙂';
  }
}