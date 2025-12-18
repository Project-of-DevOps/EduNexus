Development notes — Fixed local dev URL

Purpose
-------
To avoid inconsistent auth/session behavior during development (caused by varying localhost ports and origins), the dev server is pinned to a single host and port.

What changed
------------
- Vite is configured to use: http://localhost:5173 (see `vite.config.ts`).
- Dev scripts (`client` / `dev:client`) use `vite --port 5173`.
- `strictPort: true` is enabled so Vite will fail fast if the port is already in use.

Why this matters
-----------------
- Browser storage (localStorage) and cookies are origin-scoped (host + port). A consistent origin ensures persisted sessions work reliably across reloads and sign-in flows. If the port changes between runs, previously stored sessions are inaccessible.
- Register the exact dev URL(s) in Supabase (Authentication → Settings → Redirect URLs) to support magic-link/OAuth redirect flows during development.

How to use
----------
- Start the app with `npm run dev` as usual; the client will run on `http://localhost:5173`.
- If the port 5173 is unavailable, either free the port or change the port in `vite.config.ts` and add that URL to Supabase Redirect URLs.

Note on CI / E2E
----------------
- E2E tests should not rely on browser-localStorage for verification; prefer server-side checks using `service_role` keys or direct DB queries where possible.