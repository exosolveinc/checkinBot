/**
 * Firebase Service
 * Handles all Firestore database operations
 */

import * as admin from "firebase-admin";
import {
  CheckInRecord,
  StandupData,
} from "../models/types";

/**
 * Service for handling all Firestore database operations.
 */
export class FirebaseService {
  private db: admin.firestore.Firestore;

  /**
   * Creates a new FirebaseService instance.
   */
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    this.db = admin.firestore();
  }

  /**
   * Save check-in/check-out record
   * @param {CheckInRecord} data - The check-in or check-out record to save
   * @return {Promise<string>} The document ID of the saved record
   */
  async saveCheckIn(data: CheckInRecord): Promise<string> {
    try {
      const docRef = await this.db.collection("checkins").add({
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error saving check-in:", error);
      throw new Error("Failed to save check-in record");
    }
  }

  /**
   * Get last check-in record for a user
   * @param {string} userId - The user ID to look up
   * @return {Promise<CheckInRecord | null>} The most recent check-in record, or null if none found
   */
  async getLastCheckIn(userId: string): Promise<CheckInRecord | null> {
    try {
      const snapshot = await this.db
        .collection("checkins")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
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
      console.error("Error getting last check-in:", error);
      return null;
    }
  }

  /**
   * Check if user is currently checked in
   * @param {string} userId - The user ID to check
   * @return {Promise<boolean>} True if the user is currently checked in
   */
  async isUserCheckedIn(userId: string): Promise<boolean> {
    const lastCheckIn = await this.getLastCheckIn(userId);
    return lastCheckIn !== null && lastCheckIn.type === "checkin";
  }

  /**
   * Save standup data
   * @param {StandupData} data - The standup data to save
   * @return {Promise<string>} The document ID of the saved standup
   */
  async saveStandup(data: StandupData): Promise<string> {
    try {
      const docRef = await this.db.collection("standups").add({
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error saving standup:", error);
      throw new Error("Failed to save standup data");
    }
  }

  /**
   * Get standup for a specific date and user
   * @param {string} userId - The user ID to look up
   * @param {string} date - The date string to query
   * @return {Promise<StandupData | null>} The standup data, or null if none found
   */
  async getStandupByDate(userId: string, date: string): Promise<StandupData | null> {
    try {
      const snapshot = await this.db
        .collection("standups")
        .where("userId", "==", userId)
        .where("date", "==", date)
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
      console.error("Error getting standup:", error);
      return null;
    }
  }

  /**
   * Get user's check-in statistics
   * @param {string} userId - The user ID to get stats for
   * @param {number} daysBack - Number of days to look back (default 30)
   * @return {Promise<any>} The user's check-in statistics, or null on error
   */
  async getUserStats(userId: string, daysBack = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const snapshot = await this.db
        .collection("checkins")
        .where("userId", "==", userId)
        .where("timestamp", ">=", startDate)
        .get();

      const checkins = snapshot.docs.map((doc) => doc.data());
      const checkInCount = checkins.filter((c) => c.type === "checkin").length;
      const checkOutCount = checkins.filter((c) => c.type === "checkout").length;

      return {
        totalCheckIns: checkInCount,
        totalCheckOuts: checkOutCount,
        daysTracked: daysBack,
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      return null;
    }
  }
}
