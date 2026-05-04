# Check-In Bot

Slack bot for daily standups and end-of-day check-out, deployed as Firebase Cloud Functions backed by Firestore.

## What it does

| Command | Where it works | Behavior |
|---|---|---|
| `/checkin` or `/standup` | `#devs-standup` or `#interns-standup` | Opens the standup modal. Submitting it saves the standup and posts the formatted summary back to the same channel the command was run in. |
| `/checkout` | Any channel | Saves a checkout record (used for time-tracking stats) and posts `👋 <user> has checked out for the day!` publicly to the channel. |
| `/status` | Any channel | Ephemeral reply showing whether the user is checked in, last check-in time, and 30-day stats. |
| App Home | DM with the bot | Shows current status, today's standup (if submitted), and quick-action buttons. |

## Architecture

```
┌─────────────┐                          ┌──────────────────────┐
│  Slack User │                          │   Slack Workspace    │
└──────┬──────┘                          └──────────┬───────────┘
       │ /checkin in #devs-standup                  │
       ▼                                            │
┌──────────────────────────────────────────────┐    │
│  slackBot (HTTPS Cloud Function)             │    │
│  ─────────────────────────────────────────   │    │
│  • Bolt app handles slash commands,          │    │
│    modal submissions, app-home events        │    │
│  • Allowlists invocation channel             │    │
│  • Round-trips channel_id via                │    │
│    private_metadata on the modal             │    │
└──────┬───────────────────────────────────────┘    │
       │ writes doc                                 │
       ▼                                            │
┌──────────────────────────────────┐                │
│  Firestore                       │                │
│  ─────────────                   │                │
│  • standups/{id}                 │                │
│  • checkins/{id}                 │                │
└──────┬───────────────────────────┘                │
       │ onCreate trigger                           │
       ▼                                            │
┌──────────────────────────────────────────────┐    │
│  onStandupCreated (Firestore Cloud Function) │    │
│  • Reads channelId from the doc              │    │
│  • Posts formatted summary to that channel ──┼────┘
└──────────────────────────────────────────────┘
```

### Data flow — standup submission

1. User runs `/checkin` in `#devs-standup` (or `#interns-standup`).
2. Slash command handler in [bot.ts](src/bot.ts) verifies the channel is allowlisted, then opens the standup modal with `command.channel_id` stashed in `private_metadata`.
3. User fills out the modal and hits Submit. The view-submission handler reads `private_metadata`, then writes a doc to `standups/{id}` (which includes `channelId`) and a `checkins/{id}` doc of type `checkin`.
4. The `onStandupCreated` trigger in [index.ts](src/index.ts) fires, formats the summary via `SlackUIService.buildStandupSummaryMessage`, and posts it to the channel stored on the doc (falling back to the default dev channel if missing).

### Data flow — checkout

1. User runs `/checkout` in any channel.
2. The handler writes a `checkins/{id}` doc of type `checkout` and posts the public confirmation message to the same channel via `chat.postMessage`. No Firestore trigger involved.

## Project structure

```
src/
├── bot.ts                      # Bolt app: slash commands, view submissions, app home
├── index.ts                    # Function entry points: slackBot (HTTP) + onStandupCreated (Firestore trigger)
├── models/
│   └── types.ts                # Shared TypeScript types
└── services/
    ├── firebase.service.ts     # Firestore reads/writes (Admin SDK)
    └── slack-ui.service.ts     # Slack block-kit builders for modals + summary messages

scripts/
└── seed-data.ts                # Legacy seed script (kept for reference; not part of live flow)

firebase.json                   # Functions + Firestore deploy config
firestore.rules                 # Locked-down: deny all client access (Admin SDK bypasses)
firestore.indexes.json          # Composite indexes
```

## Configuration

### Allowlisted channels

Defined in [bot.ts](src/bot.ts) as `ALLOWED_STANDUP_CHANNELS`:

```ts
const ALLOWED_STANDUP_CHANNELS = new Set([
  "C01C0C6HYKE", // devs
  "C08UFUB9NHM", // interns
]);
```

Add a new channel ID to that set to allow `/checkin` and `/standup` from it. Standups are posted back to the channel they were invoked from.

### Default fallback channel

`STANDUP_CHANNEL_ID` in [index.ts](src/index.ts) is used by the Firestore trigger when a standup doc has no `channelId` (e.g. legacy docs, app-home button submissions).

### Environment variables

Stored in `.env` (gitignored):

```
SLACK_SIGNING_SECRET=...
SLACK_BOT_TOKEN=xoxb-...
```

Firebase Functions reads these via `dotenv` for local dev; for production, set them with `firebase functions:secrets:set` or the GCP console.

## Setup

1. **Slack app** — Create at [api.slack.com/apps](https://api.slack.com/apps). Bot scopes needed: `chat:write`, `commands`, `users:read`. Slash commands: `/checkin`, `/standup`, `/checkout`, `/status` — all pointing at your function URL.
2. **Firebase project** — Set the project ID in `.firebaserc`. Run `firebase login` and `npm install`.
3. **Local secrets** — Copy `.env` template, fill in Slack credentials, drop a `serviceAccountKey.json` for Admin SDK access (both gitignored).
4. **Build & deploy** — `npm run build && firebase deploy --only functions,firestore:rules`.
5. **Wire up Slack** — Set the slash command Request URLs and the Interactivity Request URL to the deployed function URL (output by `firebase deploy`).

## Deploy

```bash
firebase deploy --only functions               # bot code only
firebase deploy --only firestore:rules         # rules only
firebase deploy --only functions,firestore:rules
```

## Security model

- Firestore is locked down (`allow read, write: if false`) — all access is via Cloud Functions using the Firebase Admin SDK, which bypasses rules.
- Slack request signatures are verified by Bolt using `SLACK_SIGNING_SECRET`.
- Secrets (`.env`, `serviceAccountKey.json`) are gitignored. If they ever land in git history, **rotate them immediately** — GitHub secret scanning will flag them but treat them as compromised the moment they hit a commit.

## Cost protection

Firebase budget alert is configured in GCP Console → Billing → Budgets & alerts. The bot runs comfortably inside Firebase free tier (Cloud Functions: 2M invocations/mo, Firestore: 50K reads + 20K writes/day).

## Tech stack

- **Runtime**: Node.js 24, TypeScript
- **Slack**: `@slack/bolt` (Express receiver)
- **Backend**: Firebase Cloud Functions v2 (region `asia-south1`)
- **Database**: Cloud Firestore (Admin SDK)
- **Lint**: ESLint with Google style
