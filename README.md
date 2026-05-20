# Check-In Bot - Complete Setup Guide

A production-grade Slack bot for employee check-in/check-out with comprehensive standup tracking.

## 🎯 Features

- ✅ **Check-in/Check-out** - Track employee working hours
- 📝 **Standup Collection** - Multi-step modal flow with beautiful UI
- 🎭 **Feeling Tracker** - Daily mood tracking
- 📊 **Task Management** - Track yesterday's and today's tasks with metadata
- ⭐ **Confidence & Difficulty** - Rate tasks with star and flame scales
- 🔥 **Project Channels** - Automatically post to relevant project channels
- 📈 **Statistics** - View personal check-in/out statistics
- 🏗️ **Modular Architecture** - Clean, maintainable, production-ready code

## 📁 Project Structure

```
checkin-bot/
├── src/
│   ├── models/
│   │   └── types.ts              # TypeScript type definitions
│   ├── services/
│   │   ├── firebase.service.ts   # Database operations
│   │   ├── slack-ui.service.ts   # UI components builder
│   │   └── standup-flow.service.ts # Multi-step flow manager
│   ├── bot.ts                    # Main bot logic & command handlers
│   └── index.ts                  # Entry point & Firebase Function
├── scripts/
│   └── seed-data.ts              # Database initialization script
├── package.json
├── tsconfig.json
├── firebase.json
├── firestore.rules
└── firestore.indexes.json
```

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Slack workspace with admin access
- Firebase project with billing enabled

### 2. Clone and Install

```bash
# Initialize the project (if not already done)
# Run the initialization script from your document

# Navigate to project
cd checkin-bot

# Install dependencies
npm install
```

### 3. Set Up Slack App

#### A. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name: "Check-In Bot"
4. Choose your workspace

#### B. Configure OAuth & Permissions

Add these **Bot Token Scopes**:
- `chat:write` - Post messages
- `commands` - Create slash commands
- `users:read` - Read user information
- `channels:read` - Read channel information
- `im:write` - Send DMs

#### C. Create Slash Commands

Create these commands (Request URL will be added after deployment):

1. `/checkin`
   - Description: "Check in and start your workday"
   - Usage Hint: "Check in to work"

2. `/checkout`
   - Description: "Check out and end your workday"
   - Usage Hint: "Check out from work"

3. `/standup`
   - Description: "Fill out your daily standup"
   - Usage Hint: "Complete daily standup"

4. `/status`
   - Description: "View your check-in status"
   - Usage Hint: "See your current status"

#### D. Enable Interactivity

1. Go to "Interactivity & Shortcuts"
2. Turn on "Interactivity"
3. Request URL: `https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/slackBot/slack/events`
   (Update after deployment)

#### E. Install App to Workspace

1. Go to "Install App"
2. Click "Install to Workspace"
3. Authorize the app

#### F. Get Credentials

1. **Bot Token**: From "OAuth & Permissions" → "Bot User OAuth Token" (starts with `xoxb-`)
2. **Signing Secret**: From "Basic Information" → "App Credentials" → "Signing Secret"

### 4. Set Up Firebase

#### A. Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize project
firebase init

# Select:
# - Functions (using TypeScript)
# - Firestore
# 
# Use existing files when prompted
```

#### B. Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create new project or select existing
3. Enable billing (required for Cloud Functions)
4. Note your project ID

#### C. Set Firebase Project

```bash
firebase use YOUR_PROJECT_ID
```

### 5. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

Your `.env` should look like:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
```

For Firebase Functions, set environment config:

```bash
firebase functions:config:set \
  slack.bot_token="xoxb-your-bot-token-here" \
  slack.signing_secret="your-signing-secret-here"
```

### 6. Get Slack Channel IDs

For each project channel:

1. Open Slack
2. Right-click on the channel
3. Click "View channel details"
4. Scroll down and copy the Channel ID (looks like `C01234ABCDE`)

Update `scripts/seed-data.ts` with your actual channel IDs.

### 7. Seed the Database

```bash
# For local development (requires service account key)
# Download service account key from Firebase Console
# Save as serviceAccountKey.json in project root

GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run seed

# Or deploy first and use Firebase Console to add data manually
```

### 8. Build and Deploy

```bash
# Build TypeScript
npm run build

# Deploy to Firebase
firebase deploy --only functions,firestore

# Note the deployed function URL
# Example: https://us-central1-your-project.cloudfunctions.net/slackBot
```

### 9. Update Slack App URLs

Go back to your Slack App configuration:

1. **Slash Commands** - Update Request URL for each command:
   - `https://YOUR-FUNCTION-URL/slack/command`

2. **Interactivity & Shortcuts** - Update Request URL:
   - `https://YOUR-FUNCTION-URL/slack/events`

### 10. Test the Bot

In Slack:

```
/checkin        # Start check-in with standup
/standup        # Fill standup separately
/checkout       # Check out
/status         # View your status
```

## 🧪 Local Development

```bash
# Start Firebase emulators
npm run serve

# In another terminal, expose with ngrok for Slack webhooks
ngrok http 5001

# Update Slack app URLs with ngrok URL temporarily
```

## 📊 Database Structure

### Collections

#### `checkins`
```typescript
{
  userId: string,
  userName: string,
  userEmail: string,
  type: 'checkin' | 'checkout',
  timestamp: Date,
  standupId?: string
}
```

#### `standups`
```typescript
{
  userId: string,
  userName: string,
  feeling: 'great' | 'good' | 'okay' | 'tired' | 'stressed',
  yesterday: TaskEntry[],
  today: TaskEntry[],
  blockers: string,
  date: string, // YYYY-MM-DD
  timestamp: Date
}
```

#### `projectChannels`
```typescript
{
  projectName: string,
  channelId: string,
  channelName: string,
  isActive: boolean
}
```

#### `botConfig`
```typescript
{
  projects: string[],
  timeEstimates: string[],
  requireStandupOnCheckIn: boolean,
  timezone: string
}
```

## 🎨 Customization

### Adding Projects

Update in Firebase Console or via seed script:

```typescript
// In botConfig/default document
projects: ['Your Project', 'Another Project']
```

Add corresponding channel mappings in `projectChannels` collection.

### Changing Time Estimates

```typescript
// In botConfig/default document
timeEstimates: ['30min-1h', '1-2h', '2-4h', '4h+']
```

### Disabling Standup on Check-in

```typescript
// In botConfig/default document
requireStandupOnCheckIn: false
```

## 🔍 Monitoring

### View Logs

```bash
# Real-time logs
firebase functions:log --only slackBot

# Or in Firebase Console
# Functions → slackBot → Logs
```

### Check Database

Firebase Console → Firestore Database

## 🐛 Troubleshooting

### Bot Not Responding

1. Check Firebase Function logs
2. Verify Slack URLs are correct
3. Check bot token has correct scopes
4. Ensure billing is enabled on Firebase

### Modal Not Opening

1. Check signing secret is correct
2. Verify interactivity URL is set
3. Check function timeout (increase if needed)

### Messages Not Posted to Channels

1. Verify channel IDs in `projectChannels` collection
2. Ensure bot is invited to channels: `/invite @CheckInBot`
3. Check bot has `chat:write` scope

## 📈 Next Steps

- [ ] Add vacation bot integration
- [ ] Build admin web portal
- [ ] Add analytics dashboard
- [ ] Implement reminder notifications
- [ ] Add team reports
- [ ] Create data export functionality

## 🔒 Security

- Never commit `.env` or `serviceAccountKey.json`
- Use Firebase Functions config for secrets
- Implement admin-only routes in production
- Enable Firestore security rules

## 📝 License

MIT

## 🤝 Contributing

This is a production-grade implementation. Feel free to customize for your needs!

## 💡 Tips

1. Test locally with Firebase emulators first
2. Use ngrok for local Slack webhook testing
3. Monitor Cloud Function costs in Firebase Console
4. Set up alerts for function errors
5. Regularly backup Firestore data

## 🆘 Support

For issues:
1. Check Firebase Function logs
2. Verify Slack app configuration
3. Test with a single user first
4. Review Firestore security rules

---