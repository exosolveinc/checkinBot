/**
 * Standup Flow Service
 * Manages the multi-step standup collection process
 */

import { WebClient } from '@slack/web-api';
import {
  FeelingType,
  StandupData,
  StandupFlowState,
  TaskEntry,
  TaskEntryFormData,
} from '../models/types';
import { FirebaseService } from './firebase.service';
import { SlackUIService } from './slack-ui.service';

export class StandupFlowService {
  // In-memory state for standup flows (consider Redis for production multi-instance)
  private standupStates: Map<string, StandupFlowState> = new Map();

  constructor(
    private firebaseService: FirebaseService,
    private slackUIService: SlackUIService
  ) {}

  /**
   * Start the standup flow
   */
  async startStandupFlow(client: WebClient, triggerId: string, userId: string, userName: string): Promise<void> {
    try {
      // Initialize state
      this.standupStates.set(userId, {
        userId,
        userName,
        step: 'feeling',
        yesterday: [],
        today: [],
        startTime: new Date(),
      });

      // Show feeling selection modal
      await client.views.open({
        trigger_id: triggerId,
        view: this.slackUIService.buildStandupFeelingView(),
      });
    } catch (error) {
      console.error('Error starting standup flow:', error);
      throw error;
    }
  }

  /**
   * Handle feeling submission
   */
  async handleFeelingSubmit(
    client: WebClient,
    userId: string,
    feeling: FeelingType,
    viewId: string
  ): Promise<void> {
    try {
      const state = this.standupStates.get(userId);
      if (!state) {
        throw new Error('Standup state not found');
      }

      // Update state
      state.feeling = feeling;
      state.step = 'yesterday';
      this.standupStates.set(userId, state);

      // Get projects from config
      const config = await this.firebaseService.getBotConfig();

      // Show yesterday tasks modal
      await client.views.update({
        view_id: viewId,
        view: this.slackUIService.buildTaskEntryView('yesterday', config.projects),
      });
    } catch (error) {
      console.error('Error handling feeling submit:', error);
      throw error;
    }
  }

  /**
   * Handle task entry submission
   */
  async handleTaskSubmit(
    client: WebClient,
    userId: string,
    taskType: 'yesterday' | 'today',
    taskData: TaskEntryFormData,
    viewId: string,
    addAnother: boolean
  ): Promise<void> {
    try {
      const state = this.standupStates.get(userId);
      if (!state) {
        throw new Error('Standup state not found');
      }

      // Create task entry
      const task: TaskEntry = {
        project: taskData.project,
        ticketNumber: taskData.ticketNumber || 'N/A',
        taskTitle: taskData.taskTitle,
        estimatedTime: taskData.estimatedTime,
        confidenceScore: parseInt(taskData.confidenceScore),
        difficultyLevel: parseInt(taskData.difficultyLevel),
      };

      // Add task to appropriate array
      if (taskType === 'yesterday') {
        state.yesterday.push(task);
      } else {
        state.today.push(task);
      }

      this.standupStates.set(userId, state);

      // Get projects from config
      const config = await this.firebaseService.getBotConfig();

      if (addAnother) {
        // Show same modal with updated task list
        const existingTasks = taskType === 'yesterday' ? state.yesterday : state.today;
        await client.views.update({
          view_id: viewId,
          view: this.slackUIService.buildTaskEntryView(taskType, config.projects, existingTasks),
        });
      } else {
        // Move to next step
        if (taskType === 'yesterday') {
          state.step = 'today';
          this.standupStates.set(userId, state);
          // Show today tasks modal
          await client.views.update({
            view_id: viewId,
            view: this.slackUIService.buildTaskEntryView('today', config.projects),
          });
        } else {
          state.step = 'blockers';
          this.standupStates.set(userId, state);
          // Show blockers modal
          await client.views.update({
            view_id: viewId,
            view: this.slackUIService.buildBlockersView(state.yesterday, state.today),
          });
        }
      }
    } catch (error) {
      console.error('Error handling task submit:', error);
      throw error;
    }
  }

  /**
   * Handle blockers submission and complete standup
   */
  async handleBlockersSubmit(
    client: WebClient,
    userId: string,
    blockers: string
  ): Promise<StandupData> {
    try {
      const state = this.standupStates.get(userId);
      if (!state) {
        throw new Error('Standup state not found');
      }

      // Create standup data
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

      const standupData: StandupData = {
        userId: state.userId,
        userName: state.userName,
        feeling: state.feeling!,
        yesterday: state.yesterday,
        today: state.today,
        blockers: blockers || '',
        date: dateStr,
        timestamp: new Date(),
      };

      // Save to Firebase
      await this.firebaseService.saveStandup(standupData);

      // Post to project channels
      await this.postToProjectChannels(client, standupData);

      // Clean up state
      this.standupStates.delete(userId);

      return standupData;
    } catch (error) {
      console.error('Error handling blockers submit:', error);
      throw error;
    }
  }

  /**
   * Post standup summary to relevant project channels
   */
  private async postToProjectChannels(client: WebClient, standup: StandupData): Promise<void> {
    try {
      // Get unique projects from tasks
      const projects = new Set<string>();
      standup.yesterday.forEach((task) => projects.add(task.project));
      standup.today.forEach((task) => projects.add(task.project));

      // Post to each project channel
      for (const project of projects) {
        const projectChannel = await this.firebaseService.getProjectChannel(project);

        if (projectChannel) {
          try {
            await client.chat.postMessage({
              channel: projectChannel.channelId,
              blocks: this.slackUIService.buildStandupSummaryMessage(standup),
              text: `${standup.userName}'s daily standup for ${standup.date}`,
            });
          } catch (error) {
            console.error(`Error posting to channel ${projectChannel.channelName}:`, error);
            // Continue posting to other channels even if one fails
          }
        }
      }
    } catch (error) {
      console.error('Error posting to project channels:', error);
      // Don't throw - standup is already saved
    }
  }

  /**
   * Cancel standup flow
   */
  cancelStandupFlow(userId: string): void {
    this.standupStates.delete(userId);
  }

  /**
   * Get current standup state for a user
   */
  getStandupState(userId: string): StandupFlowState | undefined {
    return this.standupStates.get(userId);
  }

  /**
   * Check if user has active standup flow
   */
  hasActiveFlow(userId: string): boolean {
    return this.standupStates.has(userId);
  }

  /**
   * Clean up old standup states (call periodically)
   */
  cleanupOldStates(maxAgeMinutes: number = 60): void {
    const now = new Date().getTime();
    const maxAge = maxAgeMinutes * 60 * 1000;

    for (const [userId, state] of this.standupStates.entries()) {
      if (now - state.startTime.getTime() > maxAge) {
        this.standupStates.delete(userId);
      }
    }
  }
}