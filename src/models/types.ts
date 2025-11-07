/**
 * Type definitions for Check-in/Check-out Bot
 */

export type CheckInType = 'checkin' | 'checkout';
export type TimeEstimate = '1-2h' | '2-3h' | '3-4h' | '4h+';
export type FeelingType = 'great' | 'good' | 'okay' | 'tired' | 'stressed';

/**
 * Task entry for standup (yesterday/today tasks)
 */
export interface TaskEntry {
  project: string;
  ticketNumber: string;
  taskTitle: string;
  estimatedTime: TimeEstimate;
  confidenceScore: number; // 1-5
  difficultyLevel: number; // 1-5
}

/**
 * Complete standup data
 */
export interface StandupData {
  userId: string;
  userName: string;
  feeling: FeelingType;
  yesterday: TaskEntry[];
  today: TaskEntry[];
  blockers: string;
  date: string; // YYYY-MM-DD
  timestamp: Date;
}

/**
 * Check-in/Check-out record
 */
export interface CheckInRecord {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: CheckInType;
  timestamp: Date;
  standupId?: string; // Link to standup if collected during check-in
}

/**
 * Temporary state for multi-step standup flow
 */
export interface StandupFlowState {
  userId: string;
  userName: string;
  step: 'feeling' | 'yesterday' | 'today' | 'blockers' | 'complete';
  feeling?: FeelingType;
  yesterday: TaskEntry[];
  today: TaskEntry[];
  blockers?: string;
  startTime: Date;
}

/**
 * Project channel mapping
 */
export interface ProjectChannel {
  id?: string;
  projectName: string;
  channelId: string;
  channelName: string;
  isActive: boolean;
}

/**
 * Bot configuration
 */
export interface BotConfig {
  id: string;
  projects: string[];
  timeEstimates: TimeEstimate[];
  requireStandupOnCheckIn: boolean;
  standupReminderTime?: string; // HH:MM format
  timezone: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  userId: string;
  defaultProject?: string;
  timezone?: string;
  notificationsEnabled: boolean;
}

/**
 * Slack view state for storing temporary data
 */
export interface SlackViewState {
  type: 'task_entry' | 'standup_flow';
  data: any;
}

/**
 * Task entry form data from Slack modal
 */
export interface TaskEntryFormData {
  project: string;
  ticketNumber: string;
  taskTitle: string;
  estimatedTime: TimeEstimate;
  confidenceScore: string;
  difficultyLevel: string;
}

/**
 * Standup summary for posting to channels
 */
export interface StandupSummary {
  userId: string;
  userName: string;
  date: string;
  feeling: FeelingType;
  yesterdayTaskCount: number;
  todayTaskCount: number;
  hasBlockers: boolean;
  projects: string[];
}