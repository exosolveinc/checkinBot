/**
 * Slack UI Service
 * Builds all Slack interactive components (modals, messages, blocks)
 */

import { Block, KnownBlock, View } from '@slack/web-api';
import {
  FeelingType,
  StandupData,
  TaskEntry
} from '../models/types';

export class SlackUIService {
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