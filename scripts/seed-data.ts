/**
 * Seed Data Script
 * Sets up initial Firestore data for the bot
 */

import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';

dotenv.config();

// Initialize Firebase Admin
// For local development, set GOOGLE_APPLICATION_CREDENTIALS environment variable
admin.initializeApp();

const db = admin.firestore();

async function seedData() {
  console.log('🌱 Starting data seeding...\n');

  try {
    // 1. Create default bot configuration
    console.log('📝 Creating bot configuration...');
    await db
      .collection('botConfig')
      .doc('default')
      .set({
        id: 'default',
        projects: [
          'Project Alpha',
          'Project Beta',
          'Project Gamma',
          'Infrastructure',
          'DevOps',
          'Research',
        ],
        timeEstimates: ['1-2h', '2-3h', '3-4h', '4h+'],
        requireStandupOnCheckIn: true,
        timezone: 'Asia/Kathmandu',
      });
    console.log('✅ Bot configuration created\n');

    // 2. Create project channel mappings
    console.log('📝 Creating project channel mappings...');

    // IMPORTANT: Replace these with your actual Slack channel IDs
    // To get channel IDs: Right-click on channel -> View channel details -> Copy channel ID
    const projectChannels = [
      {
        projectName: 'Project Alpha',
        channelId: 'C01234ALPHA', // Replace with actual channel ID
        channelName: 'proj-alpha',
        isActive: true,
      },
      {
        projectName: 'Project Beta',
        channelId: 'C01234BETA', // Replace with actual channel ID
        channelName: 'proj-beta',
        isActive: true,
      },
      {
        projectName: 'Project Gamma',
        channelId: 'C01234GAMMA', // Replace with actual channel ID
        channelName: 'proj-gamma',
        isActive: true,
      },
      {
        projectName: 'Infrastructure',
        channelId: 'C01234INFRA', // Replace with actual channel ID
        channelName: 'infrastructure',
        isActive: true,
      },
      {
        projectName: 'DevOps',
        channelId: 'C01234DEVOPS', // Replace with actual channel ID
        channelName: 'devops',
        isActive: true,
      },
      {
        projectName: 'Research',
        channelId: 'C01234RESEARCH', // Replace with actual channel ID
        channelName: 'research',
        isActive: true,
      },
    ];

    for (const channel of projectChannels) {
      await db.collection('projectChannels').add(channel);
      console.log(`   ✓ Added ${channel.projectName} -> #${channel.channelName}`);
    }
    console.log('✅ Project channels created\n');

    // 3. Create sample user preferences (optional)
    console.log('📝 Creating sample user preferences...');
    await db
      .collection('users')
      .doc('U01234SAMPLE')
      .set({
        userId: 'U01234SAMPLE',
        defaultProject: 'Project Alpha',
        timezone: 'Asia/Kathmandu',
        notificationsEnabled: true,
      });
    console.log('✅ Sample user preferences created\n');

    console.log('🎉 Data seeding completed successfully!\n');
    console.log('⚠️  IMPORTANT: Update the channel IDs in scripts/seed-data.ts');
    console.log('   with your actual Slack channel IDs before using the bot!\n');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed function
seedData();