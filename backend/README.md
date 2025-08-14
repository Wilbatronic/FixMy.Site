# FixMy.Site Backend

This backend includes a Discord bot that bridges your website users to a Discord support workflow, posts service request notifications, and triggers follow-up emails when tickets are resolved.

## Overview

- Sends a rich embed to a designated Discord channel when a new service request is submitted.
- Registers and handles slash commands for managing tickets and service requests.
- Bridges messages between your web app (Socket.IO) and per-user Discord ticket channels.
- When a ticket is marked resolved via a slash command, an email is sent to the customer.

## Key Files

- `backend/notifications.js`
  - Initializes a `discord.js` v14 client with intents: `Guilds`, `GuildMessages`, `MessageContent`.
  - Logs in with `DISCORD_BOT_TOKEN` and exposes:
    - `getDiscordClient()` for other modules to access the client
    - `sendDiscordNotification(serviceRequest)` to post a rich embed to `DISCORD_CHANNEL_ID`.
- `backend/deploy-commands.js`
  - Defines and deploys slash commands to your guild (server) using `@discordjs/rest` and `discord-api-types` v9.
- `backend/socket.js`
  - Hooks into the Discord client to handle slash command interactions.
  - Bridges messages between Discord and web users using Socket.IO.
  - Creates a dedicated Discord channel (e.g., `ticket-<userId>`) when a user first messages support from the web app.
- `backend/server.js`
  - Boots the Express app, SQLite database, and imports `notifications.js` so the bot logs in on startup.
- `backend/email.js`, `backend/emailTemplate.js`
  - Sends follow-up emails when tickets are marked as resolved.

## Environment Variables

Create `backend/.env` (never commit secrets) with the following keys:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=change-this-strong-secret
OPENAI_API_KEY=sk-...
ALLOWED_ORIGINS=http://localhost:5173,https://fixmy.site

# Encryption: credentials are encrypted using a key derived from JWT_SECRET
# (No separate key required.)

# Stripe (optional if payments enabled)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI & Analytics
AI_DAILY_LIMIT_AUTH=200
AI_DAILY_LIMIT_ANON=50
INVOICE_DUE_DAYS=14

# CAPTCHA (optional)
ENABLE_CAPTCHA=1
CAPTCHA_PROVIDER=turnstile
TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key

# Moderation (optional)
ENABLE_OPENAI_MODERATION=0

# Email (SMTP)
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=William@fixmy.site
EMAIL_PASS=your-password-or-app-password
EMAIL_FROM=help@fixmy.site

# Discord
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CHANNEL_ID=channel-id-for-new-request-notifications
DISCORD_GUILD_ID=your-guild-id
DISCORD_CLIENT_ID=your-application-client-id
```

Notes:
- Enable the "Message Content Intent" for your bot in the Discord Developer Portal (required for `messageCreate`).
- Invite the bot to your guild with scopes `bot` and `applications.commands`.
- Grant permissions the bot needs: at least `Send Messages`, `Read Message History`. To auto-create ticket channels, also grant `Manage Channels`.

## Installing & Running

```bash
# From project root
npm run install-all

# Deploy slash commands to your guild (from root)
npm run deploy-commands

# Start the backend (which also logs in the Discord bot)
npm --prefix backend run dev   # or: npm --prefix backend start
```

Requirements:
- Node.js 16.11+ (Discord.js v14). Node 18 LTS recommended.

## Slash Commands

- `/ticket close`
  - Closes the current ticket channel and updates its status in the database.
- `/ticket status <status>`
  - Updates the current ticket status (`open`, `in-progress`, `completed`, `resolved`). If set to `completed`/`resolved`, a completion email is sent to the associated user.
- `/ticket delete confirm: DELETE`
  - Deletes the ticket Discord channel and removes the ticket everywhere in the backend (deletes `TicketMessage`, `Ticket`, associated `Credential` rows, and the linked `ServiceRequest`). Also emits socket events so connected dashboards refresh.
 - `/credential add for:<label> text:<secret>`
  - Stores a credential linked to the current ticket. The `text` is encrypted at rest. Use this to send site logins or API keys from Discord. Only one-way write from Discord; reveal happens in the client portal with re-auth.
- `/requests list [status]`
  - Lists service requests, optionally filtered by status.
- `/requests view <id>`
  - Shows details for a specific service request.
- `/requests update <id> <status>`
  - Updates the status of a service request.

## How It Works

1. New Service Request Notification
   - When a user submits the contact form (`POST /api/contact`), the backend creates a `ServiceRequest` record and calls `sendDiscordNotification(serviceRequest)`, which posts an embed in `DISCORD_CHANNEL_ID`.

2. Ticket Channels & Chat Bridge
   - When a web user sends a message via Socket.IO (`sendMessage`), the backend:
     - Finds or creates a Discord channel named `ticket-<userId>` in `DISCORD_GUILD_ID`.
     - Saves the `discord_channel_id` to the `Ticket` table.
     - Forwards the message to the Discord ticket channel and echoes it back to the web client.
   - When a Discord user replies in that ticket channel, the bot listens to `messageCreate` and forwards messages to the corresponding web user room via Socket.IO.

3. Resolution Email
   - Using the `/ticket status` command, setting status to `completed`/`resolved` triggers an email to the associated user via `sendEmail(...)` with `emailTemplate`.

4. Credentials via Discord
   - Use `/credential add` inside a ticket channel to securely attach a credential (encrypted) to the linked service request. Clients can reveal it later from their portal after password re-auth.

## Data Model (SQLite)

- `Ticket (user_id, service_request_id, discord_channel_id, status, client_last_read_message_id, notified_unread_message_id)`
- `ServiceRequest (id, client_name, client_email, website_url, platform_type, service_type, problem_description, urgency_level, estimated_quote, additional_features, status, discord_notified)`
- `Credential (service_request_id, user_id, label, username, password_enc, iv, last_accessed_at)`

Tables are created at startup in `server.js` if missing.

Additional tables for analytics and AI quotas:

- `AnalyticsEvent (event_name, user_id, session_id, path, referrer, user_agent, ip, extra, created_at)`
- `AIUsage (user_id, ip, date, count)`

## Deletion & Wipe Operations

### Website/API

- Delete a single ticket (authenticated user; deletes everywhere)
  - Endpoint: `DELETE /api/tickets/:ticketId`
  - Auth: requires `x-access-token` (JWT)
  - Behavior: deletes the Discord channel (if any), all `TicketMessage` for the ticket, the `Ticket` row, any `Credential` rows for its `ServiceRequest`, and the `ServiceRequest` itself. Emits `ticket_deleted`, `ticket_deleted_from_dashboard`, and `service_request_deleted` socket events.

```bash
curl -X DELETE \
  -H "x-access-token: <JWT>" \
  "http://localhost:3001/api/tickets/123"
```

- Admin: wipe all tickets (keeps service requests, resets their status to `new`)
  - Endpoint: `DELETE /api/admin/tickets/wipe`
  - Auth: requires `x-access-token` of an admin user. Admin users are defined by `ADMIN_USER_IDS` (comma-separated numeric IDs) in `backend/.env`.
  - Behavior: deletes all `TicketMessage` and all `Ticket` rows. Resets `ServiceRequest.status` to `new` for affected requests. Attempts to delete any related Discord channels. Emits `tickets_wiped`.

```bash
curl -X DELETE \
  -H "x-access-token: <ADMIN_JWT>" \
  "http://localhost:3001/api/admin/tickets/wipe"
```

- Admin: wipe all service requests (and all related data)
  - Endpoint: `DELETE /api/admin/service-requests/wipe`
  - Auth: requires `x-access-token` of an admin user (`ADMIN_USER_IDS`).
  - Behavior: deletes all `ServiceRequest` rows and cascades by code: deletes related `Credential`, `Ticket`, and `TicketMessage` rows; attempts to delete related Discord channels. Emits `service_requests_wiped`.

```bash
curl -X DELETE \
  -H "x-access-token: <ADMIN_JWT>" \
  "http://localhost:3001/api/admin/service-requests/wipe"
```

### CLI Utilities

- Wipe all tickets (keeps service requests; sets `status=new`):

```bash
npm --prefix backend run wipe:tickets
```

- Wipe all service requests (and related tickets/messages/credentials):

```bash
npm --prefix backend run wipe:service-requests
```

### Notes

- Admin users are determined by `ADMIN_USER_IDS` in `backend/.env`, for example:

```env
ADMIN_USER_IDS=1,42
```

- Socket events used by the frontend to refresh lists:
  - `ticket_deleted`, `ticket_deleted_from_dashboard`, `tickets_wiped`, `service_requests_wiped`, `service_request_deleted`.

## Auth tokens

- Access token: short-lived JWT returned on login, sent via `x-access-token` header.
- Refresh token: httpOnly cookie `refresh_token` issued on login and rotated on refresh.
- Endpoints:
  - `POST /api/token/refresh` (uses cookie; returns new access token)
  - `POST /api/logout` (revokes current refresh token; requires `x-access-token`)

## Troubleshooting

- Slash commands do not appear:
  - Re-run `npm run deploy-commands` and confirm `DISCORD_CLIENT_ID` and `DISCORD_GUILD_ID` are correct.
  - If you see "Unknown Application (10002)", the deploy script will auto-detect the correct app id from your bot token and log it. Update `backend/.env` `DISCORD_CLIENT_ID` to that value.
  - It can take up to a minute to propagate; try re-inviting the bot if needed.
- Bot not responding to messages:
  - Verify `DISCORD_BOT_TOKEN` is valid and the bot is online.
  - Ensure the bot has the required permissions in the channel/guild.
  - Enable the "Message Content Intent" in the Developer Portal.
- Ticket channel not created:
  - Ensure the bot has `Manage Channels` permission in the guild.
- Emails not sending on resolve:
  - Confirm email env vars and credentials. Some providers require explicit "Send As" permission for the configured `EMAIL_FROM`.

## Security Notes

- Do not commit `.env` files or secrets.
- The credential vault in the client portal provides a secure way for clients to manage their sensitive information. All data is encrypted at rest, and revealing a password requires re-authentication.
