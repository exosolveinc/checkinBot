/**
 * Firebase Service
 * Handles all Firestore database operations
 */

import * as admin from 'firebase-admin';
import {
  BotConfig,
  CheckInRecord,
  ProjectChannel,
  StandupData,
  UserPreferences
} from '../models/types';

export class FirebaseService {
  private db: admin.firestore.Firestore;

  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    this.db = admin.firestore();
  }

  /**
   * Save check-in/check-out record
   */
  async saveCheckIn(data: CheckInRecord): Promise<string> {
    try {
      const docRef = await this.db.collection('checkins').add({
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving check-in:', error);
      throw new Error('Failed to save check-in record');
    }
  }

  /**
   * Get last check-in record for a user
   */
  async getLastCheckIn(userId: string): Promise<CheckInRecord | null> {
    try {
      const snapshot = await this.db
        .collection('checkins')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      } as CheckInRecord;
    } catch (error) {
      console.error('Error getting last check-in:', error);
      return null;
    }
  }

  /**
   * Check if user is currently checked in
   */
  async isUserCheckedIn(userId: string): Promise<boolean> {
    const lastCheckIn = await this.getLastCheckIn(userId);
    return lastCheckIn !== null && lastCheckIn.type === 'checkin';
  }

  /**
   * Save standup data
   */
  async saveStandup(data: StandupData): Promise<string> {
    try {
      const docRef = await this.db.collection('standups').add({
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving standup:', error);
      throw new Error('Failed to save standup data');
    }
  }

  /**
   * Get standup for a specific date and user
   */
  async getStandupByDate(userId: string, date: string): Promise<StandupData | null> {
    try {
      const snapshot = await this.db
        .collection('standups')
        .where('userId', '==', userId)
        .where('date', '==', date)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      } as StandupData;
    } catch (error) {
      console.error('Error getting standup:', error);
      return null;
    }
  }

  /**
   * Get standups for a project within date range
   */
  async getStandupsByProject(
    project: string,
    startDate: string,
    endDate: string
  ): Promise<StandupData[]> {
    try {
      const snapshot = await this.db
        .collection('standups')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();

      const standups = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            ...data,
            timestamp: data.timestamp?.toDate(),
          } as StandupData;
        })
        .filter((standup) => {
          // Filter standups that have tasks for this project
          const hasProject =
            standup.yesterday?.some((task) => task.project === project) ||
            standup.today?.some((task) => task.project === project);
          return hasProject;
        });

      return standups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error getting standups by project:', error);
      return [];
    }
  }

  /**
   * Get project channel mapping
   */
  async getProjectChannel(projectName: string): Promise<ProjectChannel | null> {
    try {
      const snapshot = await this.db
        .collection('projectChannels')
        .where('projectName', '==', projectName)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as ProjectChannel;
    } catch (error) {
      console.error('Error getting project channel:', error);
      return null;
    }
  }

  /**
   * Get all active project channels
   */
  async getAllProjectChannels(): Promise<ProjectChannel[]> {
    try {
      const snapshot = await this.db
        .collection('projectChannels')
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ProjectChannel[];
    } catch (error) {
      console.error('Error getting all project channels:', error);
      return [];
    }
  }

  /**
   * Get bot configuration
   */
  async getBotConfig(): Promise<BotConfig> {
    try {
      const doc = await this.db.collection('botConfig').doc('default').get();

      if (!doc.exists) {
        // Return default config
        return {
          id: 'default',
          projects: [],
          timeEstimates: ['1-2h', '2-3h', '3-4h', '4h+'],
          requireStandupOnCheckIn: true,
          timezone: 'Asia/Kathmandu',
        };
      }

      return doc.data() as BotConfig;
    } catch (error) {
      console.error('Error getting bot config:', error);
      // Return default config on error
      return {
        id: 'default',
        projects: [],
        timeEstimates: ['1-2h', '2-3h', '3-4h', '4h+'],
        requireStandupOnCheckIn: true,
        timezone: 'Asia/Kathmandu',
      };
    }
  }

  /**
   * Update bot configuration
   */
  async updateBotConfig(config: Partial<BotConfig>): Promise<void> {
    try {
      await this.db.collection('botConfig').doc('default').set(config, { merge: true });
    } catch (error) {
      console.error('Error updating bot config:', error);
      throw new Error('Failed to update bot configuration');
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const doc = await this.db.collection('users').doc(userId).get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as UserPreferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Save/Update user preferences
   */
  async saveUserPreferences(prefs: UserPreferences): Promise<void> {
    try {
      await this.db.collection('users').doc(prefs.userId).set(prefs, { merge: true });
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw new Error('Failed to save user preferences');
    }
  }

  /**
   * Add or update project channel
   */
  async saveProjectChannel(channel: ProjectChannel): Promise<string> {
    try {
      if (channel.id) {
        await this.db.collection('projectChannels').doc(channel.id).set(channel, { merge: true });
        return channel.id;
      } else {
        const docRef = await this.db.collection('projectChannels').add(channel);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error saving project channel:', error);
      throw new Error('Failed to save project channel');
    }
  }

  /**
   * Get user's check-in statistics
   */
  async getUserStats(userId: string, daysBack: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const snapshot = await this.db
        .collection('checkins')
        .where('userId', '==', userId)
        .where('timestamp', '>=', startDate)
        .get();

      const checkins = snapshot.docs.map((doc) => doc.data());
      const checkInCount = checkins.filter((c) => c.type === 'checkin').length;
      const checkOutCount = checkins.filter((c) => c.type === 'checkout').length;

      return {
        totalCheckIns: checkInCount,
        totalCheckOuts: checkOutCount,
        daysTracked: daysBack,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }
}