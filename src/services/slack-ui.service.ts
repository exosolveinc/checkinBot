/**
 * Slack UI Service
 * Builds all Slack interactive components (modals, messages, blocks)
 */

import {Block, KnownBlock, View} from "@slack/web-api";
import {
  CheckInRecord,
  FeelingType,
  StandupData,
} from "../models/types";

/**
 * Service for building Slack interactive UI components.
 */
export class SlackUIService {
  /**
   * Build the App Home view with action buttons
   * @param {string} userName - User name
   * @param {boolean} isCheckedIn - Whether the user is currently checked in
   * @param {CheckInRecord | null} lastCheckIn - Last check-in record
   * @param {any} stats - User statistics for the last 30 days
   * @param {StandupData | null} todayStandup - Today's standup data if submitted
   * @return {View} The App Home view
   */
  buildAppHomeView(
    userName: string,
    isCheckedIn: boolean,
    lastCheckIn: CheckInRecord | null,
    stats: any,
    todayStandup: StandupData | null
  ): View {
    const currentTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const blocks: (Block | KnownBlock)[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `👋 Welcome, ${userName}!`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🕐 Current time: *${currentTime}*`,
        },
      },
      {
        type: "divider",
      },
    ];

    // Status Section
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: isCheckedIn ?
          "✅ *Status: Checked In*\nYou are currently active." :
          "⏸️ *Status: Checked Out*\nStart your day by checking in!",
      },
    });

    if (lastCheckIn) {
      const lastTime = lastCheckIn.timestamp.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Last activity: ${lastCheckIn.type === "checkin" ? "Checked in" : "Checked out"} at ${lastTime}`,
          },
        ],
      });
    }

    blocks.push({
      type: "divider",
    });

    // Quick Actions Section
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*⚡ Quick Actions*",
      },
    });

    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "📝 Check In",
            emoji: true,
          },
          style: "primary",
          action_id: "home_checkin",
          value: "checkin",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "📝 Submit Standup",
            emoji: true,
          },
          style: todayStandup ? undefined : "primary",
          action_id: "home_start_standup",
          value: "start_standup",
        },
      ],
    });

    blocks.push({
      type: "divider",
    });

    // Standup Status
    if (todayStandup) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *Today's Standup Completed*\n📊 Yesterday: ${todayStandup.yesterday.length} task(s)\n📋 Today: ${todayStandup.today.length} task(s)\n${todayStandup.blockers ? "🚧 Has blockers" : ""}`,
        },
      });
    } else {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "⏰ *Today's Standup: Not submitted*\nClick \"Submit Standup\" to share your daily update.",
        },
      });
    }

    blocks.push({
      type: "divider",
    });

    // Stats Section
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*📊 Your Stats (Last 30 Days)*",
      },
    });

    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Check-ins*\n${stats?.totalCheckIns || 0}`,
        },
        {
          type: "mrkdwn",
          text: `*Check-outs*\n${stats?.totalCheckOuts || 0}`,
        },
      ],
    });

    return {
      type: "home",
      blocks,
    };
  }

  /**
   * Build the check-in standup modal.
   * @param {string} [channelId] - Channel ID to round-trip via private_metadata
   * @return {View} The standup modal view
   */
  buildQuickStandupModal(channelId?: string): View {
    return {
      type: "modal",
      callback_id: "quick_standup_submit",
      private_metadata: channelId || "",
      title: {
        type: "plain_text",
        text: "Daily Check-In",
      },
      submit: {
        type: "plain_text",
        text: "Submit",
      },
      close: {
        type: "plain_text",
        text: "Cancel",
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "📝 *Daily Standup*",
          },
        },
        {type: "divider"},
        {
          type: "input",
          block_id: "feeling_selection",
          element: {
            type: "static_select",
            action_id: "feeling",
            placeholder: {
              type: "plain_text",
              text: "How are you feeling?",
            },
            options: [
              {
                text: {type: "plain_text", text: "😄 Great", emoji: true},
                value: "great",
              },
              {
                text: {type: "plain_text", text: "🙂 Good", emoji: true},
                value: "good",
              },
              {
                text: {type: "plain_text", text: "😐 Okay", emoji: true},
                value: "okay",
              },
              {
                text: {type: "plain_text", text: "😓 Tired", emoji: true},
                value: "tired",
              },
              {
                text: {type: "plain_text", text: "😰 Stressed", emoji: true},
                value: "stressed",
              },
            ],
          },
          label: {
            type: "plain_text",
            text: "How do you feel today?",
          },
        },
        {
          type: "input",
          block_id: "accomplishment",
          element: {
            type: "plain_text_input",
            action_id: "accomplishment_input",
            placeholder: {
              type: "plain_text",
              text: "Your key goal for the day",
            },
            multiline: true,
          },
          label: {
            type: "plain_text",
            text: "What would make you feel accomplished if you completed it today?",
          },
        },
        {
          type: "input",
          block_id: "yesterday_summary",
          element: {
            type: "plain_text_input",
            action_id: "summary_input",
            placeholder: {
              type: "plain_text",
              text: "Quick update on progress and deliverables",
            },
            multiline: true,
          },
          label: {
            type: "plain_text",
            text: "What did you do yesterday?",
          },
        },
        {
          type: "input",
          block_id: "today_plan",
          element: {
            type: "plain_text_input",
            action_id: "plan_input",
            placeholder: {
              type: "plain_text",
              text: "List your tasks and priorities",
            },
            multiline: true,
          },
          label: {
            type: "plain_text",
            text: "What are your plans for today?",
          },
        },
        {
          type: "input",
          block_id: "blockers",
          element: {
            type: "plain_text_input",
            action_id: "blockers_input",
            placeholder: {
              type: "plain_text",
              text: "Flag issues early so others can help",
            },
            multiline: true,
          },
          label: {
            type: "plain_text",
            text: "Any Blockers?",
          },
          optional: true,
        },
        {
          type: "input",
          block_id: "notion_updated",
          element: {
            type: "static_select",
            action_id: "notion_select",
            placeholder: {
              type: "plain_text",
              text: "Select",
            },
            options: [
              {
                text: {type: "plain_text", text: "Yes"},
                value: "yes",
              },
              {
                text: {type: "plain_text", text: "No"},
                value: "no",
              },
              {
                text: {type: "plain_text", text: "Not yet"},
                value: "not_yet",
              },
            ],
          },
          label: {
            type: "plain_text",
            text: "Did you update Notion today?",
          },
        },
      ],
    };
  }

  /**
   * Build standup summary for posting to channel.
   * Uses attachments for colored sidebar bars.
   * @param {any} data - The standup data
   * @return {any} Message payload with blocks + attachments
   */
  buildStandupSummaryMessage(data: any): any {
    const feelingEmoji = this.getFeelingEmoji(data.feeling);

    const blocks: any[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${data.userId}> submitted standup ${feelingEmoji}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `📅 ${data.date} | Feeling: *${data.feeling}*`,
          },
        ],
      },
    ];

    // Colored attachments for each field
    const attachments: any[] = [];

    if (data.yesterday) {
      attachments.push({
        color: "#36a64f",
        text: `*What did you do yesterday?*\n${data.yesterday}`,
        mrkdwn_in: ["text"],
      });
    }

    if (data.today) {
      attachments.push({
        color: "#2196F3",
        text: `*What are your plans for today?*\n${data.today}`,
        mrkdwn_in: ["text"],
      });
    }

    if (data.blockers) {
      attachments.push({
        color: "#FF5252",
        text: `*Anything blocking your progress?*\n${data.blockers}`,
        mrkdwn_in: ["text"],
      });
    }

    if (data.accomplishment) {
      attachments.push({
        color: "#9C27B0",
        text: `*What would make you feel accomplished if you completed it today?*\n${data.accomplishment}`,
        mrkdwn_in: ["text"],
      });
    }

    const notionLabel = data.notionUpdated === "yes" ? "Yes ✅" :
      data.notionUpdated === "not_yet" ? "Not yet ⏳" : "No ❌";
    const notionColor = data.notionUpdated === "yes" ? "#36a64f" :
      data.notionUpdated === "not_yet" ? "#FF9800" : "#FF5252";
    attachments.push({
      color: notionColor,
      text: `*Notion updated:* ${notionLabel}`,
      mrkdwn_in: ["text"],
    });

    return {blocks, attachments};
  }

  /**
   * Build status message
   * @param {string} userName - User name
   * @param {boolean} isCheckedIn - Whether the user is currently checked in
   * @param {Date | null} lastCheckIn - Timestamp of the last check-in
   * @param {any} stats - User statistics for the last 30 days
   * @return {(Block | KnownBlock)[]} Array of Slack blocks for the status message
   */
  buildStatusMessage(
    userName: string,
    isCheckedIn: boolean,
    lastCheckIn: Date | null,
    stats: any
  ): (Block | KnownBlock)[] {
    return [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${userName}'s Status`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Current Status:*\n${isCheckedIn ? "✅ Checked In" : "⏸️ Checked Out"}`,
          },
          {
            type: "mrkdwn",
            text: `*Last Activity:*\n${lastCheckIn ? lastCheckIn.toLocaleString() : "N/A"}`,
          },
        ],
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Last 30 Days:*\n• Check-ins: ${stats?.totalCheckIns || 0}\n• Check-outs: ${stats?.totalCheckOuts || 0}`,
        },
      },
    ];
  }

  /**
   * Get emoji for feeling type
   * @param {FeelingType} feeling - The feeling type
   * @return {string} Emoji corresponding to the feeling
   */
  private getFeelingEmoji(feeling: FeelingType): string {
    const emojiMap: Record<FeelingType, string> = {
      great: "😄",
      good: "🙂",
      okay: "😐",
      tired: "😓",
      stressed: "😰",
    };
    return emojiMap[feeling] || "🙂";
  }
}
