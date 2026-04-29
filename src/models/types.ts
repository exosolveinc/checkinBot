/**
 * Type definitions for Check-in/Check-out Bot
 */

export type CheckInType = "checkin" | "checkout";
export type TimeEstimate = "1-2h" | "2-3h" | "3-4h" | "4h+";
export type FeelingType = "great" | "good" | "okay" | "tired" | "stressed";

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

