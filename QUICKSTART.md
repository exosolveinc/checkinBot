# Quick Start Guide - Check-In Bot

Get your bot running in 15 minutes! ⚡

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Firebase account created
- [ ] Slack workspace admin access
- [ ] 15 minutes of time

## Step 1: Create Slack App (5 minutes)

### A. Create App

1. Visit [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name: `Check-In Bot`
4. Select your workspace

### B. Add Permissions

Go to **OAuth & Permissions** → **Scopes** → Add these Bot Token Scopes:

```
✓ chat:write
✓ commands
✓ users:read
✓ channels:read
✓ im:write
```

### C. Create Commands

Go to **Slash Commands** → Create each:

| Command | Description |
|---------|-------------|
| `/checkin` | Check in and start your workday |
| `/checkout` | Check out and end your workday |
| `/standup` | Fill out your daily standup |
| `/status` | View your check-in status |

*Leave Request URL blank for now*

### D. Install to Workspace

1. Go to **Install App**
2. Click **"Install to Workspace"**
3. Copy **Bot User OAuth Token** (starts with `xoxb-`)
4. Go to **Basic Information** → Copy **Signing Secret**

## Step 2: Set Up Firebase (5 minutes)

### A. Create Project

1. Visit [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Name: `checkin-bot`
4. Disable Google Analytics (optional)
5. Create project

### B. Enable Billing

1. Go to project settings (gear icon)
2. Click **Usage and billing**
3. Click **Modify plan**
4. Select **Blaze (pay as you go)**

*Free tier is generous - minimal cost for small teams*

### C. Note Project ID

Copy your project ID from the project settings page

## Step 3: Deploy Bot (5 minutes)

### A. Setup Project

```bash
# Clone/navigate to project
cd checkin-bot

# Install dependencies
npm install

# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize (select existing project)
firebase use YOUR_PROJECT_ID
```

### B. Configure Environment

```bash
# Create .env file
cp .env.example .env

# Edit .env with your values
nano .env
```

Add your Slack credentials:

```env
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-secret-here
```

### C. Update Channel IDs

Edit `scripts/seed-data.ts`:

1. Get channel IDs from Slack (right-click channel → View details)
2. Replace placeholder IDs with real ones:

```typescript
channelId: 'C01234ALPHA', // Replace with your channel ID
```

### D. Deploy

```bash
# Build and deploy
./deploy.sh

# Or manually:
npm run build
firebase deploy --only functions,firestore
```

Copy the function URL from the output:
```
https://REGION-PROJECT.cloudfunctions.net/slackBot
```

## Step 4: Connect Slack to Firebase (2 minutes)

### A. Update Slack URLs

Go back to your Slack app configuration:

1. **Slash Commands** - For each command, set Request URL:
   ```
   https://YOUR-FUNCTION-URL/slack/command
   ```

2. **Interactivity & Shortcuts** - Enable and set Request URL:
   ```
   https://YOUR-FUNCTION-URL/slack/events
   ```

### B. Invite Bot to Channels

In each project channel in Slack:

```
/invite @Check-In Bot
```

## Step 5: Test (2 minutes)

In Slack, try:

```
/checkin
```

You should see the standup modal! 🎉

Try other commands:
```
/status
/checkout
```

## Troubleshooting

### Modal doesn't open

- Check function URL is correct in Slack
- Verify signing secret matches
- Check Firebase logs: `firebase functions:log`

### Not posting to channels

- Ensure bot is invited to channels
- Verify channel IDs in Firestore
- Check bot has `chat:write` permission

### Deployment fails

- Ensure billing is enabled on Firebase
- Check Node.js version (need 18+)
- Verify you're logged in: `firebase login`

### Function errors

```bash
# View real-time logs
firebase functions:log

# Or check Firebase Console
# Functions → slackBot → Logs
```

## What's Next?

✅ **Working Bot**: Your team can now check in/out  
✅ **Standup Tracking**: Daily updates in project channels  
✅ **Status Checks**: View personal statistics  

### Customize

1. Add more projects in Firestore
2. Customize time estimates
3. Add team members
4. Set up vacation bot (Phase 2)

### Monitor

- Firebase Console → Functions → Metrics
- Check Firestore for data
- Monitor costs (usually <$5/month for small teams)

## Need Help?

1. Check `README.md` for detailed docs
2. Review `ARCHITECTURE.md` for internals
3. Check Firebase Function logs
4. Verify Firestore security rules

---

**Estimated Time**: 15 minutes  
**Difficulty**: Beginner-friendly  
**Cost**: ~$0-5/month for small teams

Ready to build more? Check out the vacation bot next! 🏖️