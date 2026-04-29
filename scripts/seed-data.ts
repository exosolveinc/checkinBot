/**
 * Seed Data Script.
 * Sets up initial Firestore data for the bot.
 */

import * as dotenv from "dotenv";
import * as admin from "firebase-admin";

dotenv.config();

admin.initializeApp();

const db = admin.firestore();

/**
 * Seeds Firestore with initial bot configuration.
 */
async function seedData() {
  console.log("🌱 Starting data seeding...\n");

  try {
    console.log("📝 Creating bot configuration...");
    await db
      .collection("botConfig")
      .doc("default")
      .set({
        id: "default",
        projects: [
          "General",
        ],
        timeEstimates: ["1-2h", "2-3h", "3-4h", "4h+"],
        requireStandupOnCheckIn: true,
        timezone: "Asia/Kathmandu",
      });
    console.log("✅ Bot configuration created\n");

    console.log("📝 Creating project channel mappings...");

    const projectChannels = [
      {
        projectName: "General",
        channelId: "C01C0C6HYKE",
        channelName: "stand-up",
        isActive: true,
      },
      // add more projects and channels as needed
    ];

    for (const channel of projectChannels) {
      await db.collection("projectChannels").add(channel);
      console.log(`   ✓ Added ${channel.projectName} -> #${channel.channelName}`);
    }
    console.log("✅ Project channels created\n");

    console.log("🎉 Data seeding completed successfully!\n");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedData();
