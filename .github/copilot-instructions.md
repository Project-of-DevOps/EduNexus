Purpose: concise, actionable guidance for AI coding agents working in this repo.

# EduNexus-AI — Copilot instructions

Keep this short and specific. When you need more context, open the referenced files.

- **Big picture**: a Vite + React (TypeScript) SPA frontend paired with an Express/Node backend that uses Postgres (server/db.js). The UI is intentionally "local-first" for some workflows (see `context/DataContext.tsx` and `context/AuthContext.tsx`) which queue actions locally when the API is offline and retry in background (disk queues in `server/data/*`).

- **Run & dev**:
  - **Client**: `npm run client` (or `npm run dev`) — Vite dev server.
  - **Server**: `npm run server` — runs `server/index.js`.
  - **Full dev**: `npm run dev:all` — runs client, server and `python` helper service concurrently.
  - **Worker**: `npm run worker:once` or `npm run worker:run` — outbox/inbound worker (`server/outboxWorker.js`) that processes disk queues and email delivery.

- **Tests**: `npm run test` (Vitest using jsdom); `npm run test:ui` for interactive UI. Tests run with `NODE_ENV=test` which changes startup behavior (server won't exit on missing env vars during tests). See `vitest.config.ts`.

- **Environment & secrets** (most important):
  - `DATABASE_URL` and `JWT_SECRET` are required for server mode (server checks and fails unless `NODE_ENV==='test'`). See `server/index.js` and `server/db.js`.
  - Optional integrations: `SENDGRID_API_KEY` (SendGrid), `SMTP_*` env vars, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client SSO), `VITE_API_URL` (client -> server base URL), `ADMIN_API_KEY` (protects admin routes).

- **Patterns & project-specific conventions**:
  - Local-first UX: management signups may be queued locally when the backend is unavailable (`context/DataContext.tsx` + disk queue `server/data/signup_queue_disk.json`) and retried (worker and background effects). Prefer to implement features that gracefully handle offline/queued state.
  - Role-centric routing/logic: many flows branch on `role` (Management, Teacher, Parent, Student, Librarian). See `context/AuthContext.tsx` and pages in `pages/` for routing conventions.
  - SSO flow: Supabase is used for provider auth; the client exchanges provider tokens with the backend at `/api/auth/google-login`. See `services/supabaseClient.ts` and `context/AuthContext.tsx` for the exact behavior.
  - Admin tooling: admin endpoints (under `/api/admin/*`) are protected via `ADMIN_API_KEY` in header or query param. Useful for inspecting `server/data/*` and forcing retries.
  - Email/outbox model: emails are delivered via SendGrid -> SMTP -> disk outbox fallback. The worker uses `appendOutbox` and `processOutboxOnce`. See `server/outboxWorker.js` and `server/index.js` for examples of robust fallback logic and how tests inject alternate implementations.

- **Where to look first when changing behavior**:
  - API surface & auth: [server/index.js](../server/index.js#L1)
  - DB helpers & queries: [server/db.js](../server/db.js#L1)
  - Background worker & disk queues: [server/outboxWorker.js](../server/outboxWorker.js#L1)
  - Local-first frontend data and queues: [context/DataContext.tsx](../context/DataContext.tsx#L1) and [context/AuthContext.tsx](../context/AuthContext.tsx#L1)
  - Supabase SSO client: [services/supabaseClient.ts](../services/supabaseClient.ts#L1)

- **Small actionable rules for AI changes**:
  - Preserve existing "best-effort" fallback behavior (do not crash if an external service is missing). When modifying server startup checks, keep `NODE_ENV==='test'` behavior intact to avoid breaking tests.
  - Use existing env var names; add new envs only sparingly and document them here.
  - When adding API endpoints, add matching client usage in `context/*` or `pages/*` and update `DataContext` sync logic if data belongs on the dashboard.
  - Prefer to add tests (Vitest) for new behavior and use dependency injection or overrides like `setSendEmail`/`setDb` already present in worker/server files to make tests deterministic.

If anything here is unclear or you want more detail (e.g. how a specific endpoint is used by the UI), tell me which area and I'll expand the section or add quick examples.
