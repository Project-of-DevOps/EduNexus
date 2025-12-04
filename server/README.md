Edunexus local API server

Requirements
- Node 18+ (or installed node)
- A running Postgres server. The default connection is postgres://postgres@localhost:5432/postgres

Quick start
1. Install dependencies
   npm install
2. Create the database and run the migration (example using psql):
   psql -c "CREATE DATABASE edunexus_db;" -U postgres
   psql -d edunexus_db -f migrations/001_create_users.sql
   psql -d edunexus_db -f migrations/002_create_signup_syncs.sql
3. Run the server
   PORT=4000 DATABASE_URL=postgresql://postgres@localhost:5432/edunexus_db npm start

Endpoints
- POST /api/signup { name, email, password, role } -> inserts user and returns user
   - Note: calls that come from the client queued-sync will include header `X-Queued-Signup: 1` and the server will write audit rows into the `signup_syncs` table.
- POST /api/login { email, password, role } -> returns user on successful auth
 - GET /api/sync-audit -> returns recent signup_syncs audit rows

Inbound & offline reliability
- The server will persist outbound messages to server/data/outbox.json and queued signups to server/data/signup_queue_disk.json when the DB or SMTP is unavailable.
- There's a standalone worker (server/outboxWorker.js) that can run separately to replay the outbox and signup queue when connectivity returns. See server/README-worker.md for details.
- You can accept inbound webhooks (SendGrid Inbound Parse) at POST /api/webhook/inbound — set WEBHOOK_SECRET to protect the endpoint. If your webserver is sometimes offline prefer running the worker on a different host with IMAP credentials so inbound mail is saved to server/data/inbound.json.
