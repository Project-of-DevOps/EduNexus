<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Nj1a3QqlD2aGYJ5IcS540Fj_pFi-TZ2_

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Outbox worker / durable delivery

If you want reliable delivery of queued emails and replay of offline signups independently of the main server process,
there's a small worker included at `server/outboxWorker.js`.

   `node server/outboxWorker.js --once`

   `node server/outboxWorker.js`

Environment variables:

Outbox worker & hosted email
--------------------------------
This project includes an independent outbox worker (server/outboxWorker.js) that can process queued emails and queued signups persisted to disk. Use it when you need email delivery and queue processing even if the main web process is offline.

Run worker once:

```powershell
npm run worker:once
```

Run worker as a service:

```powershell
npm run worker:run
```

Configure a hosted email provider (recommended):
- SENDGRID_API_KEY=your_key  (preferred)
- Or provide SMTP settings: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

The worker will prefer SendGrid, fall back to SMTP, then persist messages to server/data/outbox.json for later retry.

The worker reads `server/data/outbox.json` and `server/data/signup_queue_disk.json` and will attempt retries and
natural backoff by tracking an `attempts` counter. This is useful when your main server or DB is temporarily unavailable.
