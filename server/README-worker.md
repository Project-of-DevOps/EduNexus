Outbox Worker (server/outboxWorker.js)

What it does
- Processes server/data/outbox.json and server/data/signup_queue_disk.json
- Attempts to deliver emails using SendGrid (SENDGRID_API_KEY) or SMTP (SMTP_* env vars)
- If delivery fails it persists messages for retry
- Tries to insert queued signups into the database when DB is reachable
 - Also optionally polls an IMAP mailbox to capture inbound messages when the main server or webhooks are unavailable
 - Outbound messages have a `history` array and inbound messages are stored under server/data/inbound.json for administrative review

Run one-shot:

PowerShell:

```powershell
npm run worker:once
```

Run continuously (background):

```powershell
npm run worker:run
```

Suggested deployment options
- Run the worker as a separate process on your server/VM and configure a system service (systemd) or Windows service to auto-start it.
- Use a container orchestration (Docker Compose, Kubernetes) to run it separately from the main webserver.

Example systemd unit (Linux):

```
[Unit]
Description=EduNexus Outbox Worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/EduNexus-AI
ExecStart=/usr/bin/node server/outboxWorker.js
Restart=on-failure
User=edunexus
Environment=NODE_ENV=production
Environment=SENDGRID_API_KEY=...
Environment=ADMIN_ALERT_EMAIL=admin@example.com

[Install]
WantedBy=multi-user.target
```

Configuration environment variables
- SENDGRID_API_KEY (optional - preferred delivery)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (fallback SMTP)
- WORKER_INTERVAL_MS (loop interval in ms)
 - IMAP_HOST, IMAP_USER, IMAP_PASS, IMAP_PORT (optional) — when configured the worker will poll for unseen inbound messages and persist them to server/data/inbound.json

Notes
- Keep this process running to ensure queued messages & signups are retried/delivered when DB or SMTP is available.
- The worker respects the same outbox & disk queue files used by the server so either process can produce or replay messages.

Admin & verification
- Inspect outbound queued messages and delivery history: GET /api/admin/outbox (requires X-Admin-Key)
- Inspect inbound messages collected by the worker: GET /api/admin/inbound (requires X-Admin-Key)

If you want to accept inbound webhooks instead of IMAP polling (e.g. SendGrid Inbound Parse) you can configure your provider to POST into an endpoint you control; if the endpoint is occasionally offline prefer IMAP polling on a separate worker host so messages are still captured and persisted to disk.
