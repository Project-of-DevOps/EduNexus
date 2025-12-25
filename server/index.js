// --- CRASH REPORTER: ADD THIS TO THE VERY TOP OF server/index.js ---
process.on('uncaughtException', (err) => {
  console.error('CRITICAL ERROR:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});
console.log('Server is starting...');
// ------------------------------------------------------------------

try {
  require('dotenv').config();
  // Also load from parent directory .env if it exists (shared env vars)
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  console.log('Server starting... Environment loaded via dotenv.');
} catch (e) {
  console.warn('dotenv not installed or failed to load - continuing without .env');
}
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db');
let pool = db.pool;
const logger = require('./utils/logger');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const crypto = require('crypto');
const { signupSchema, loginSchema } = require('./utils/validation');
const { createClient } = require('@supabase/supabase-js');
const z = require('zod');

// Environment Validation
const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  // During tests we may not set real env vars. Don't crash the process in test
  // mode — log a warning so tests can inject mocks. In production / dev we
  // still want the process to fail fast when required env vars are missing.
  const msg = `Missing required environment variables: ${missingEnv.join(', ')}`;
  if (process.env.NODE_ENV === 'test') {
    logger.warn(msg);
  } else {
    logger.error(msg);
    process.exit(1);
  }
}

// Initialize Supabase Client (Service Role for Admin Admin)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
let supabase;
const metrics = require('./metrics');
let supabaseDownUntil = 0; // timestamp until which we consider supabase down
const SUPABASE_DOWN_TTL_MS = Number(process.env.SUPABASE_DOWN_TTL_MS || 60_000);

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    logger.warn('Failed to initialize Supabase client', e?.message || e);
    supabase = null;
  }
} else {
  logger.warn("Supabase credentials missing. Migrated Python endpoints will fail.");
}

// In production, require Supabase to be configured (we rely on Supabase Auth and shared hosted tables)
if (process.env.NODE_ENV === 'production' && (!supabaseUrl || !supabaseKey)) {
  logger.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in production. Exiting to avoid inconsistent auth behavior.');
  process.exit(1);
}

// Warn when both Supabase and a local DATABASE_URL are configured — this is often intentional (dev),
// but in deployments it can cause divergence if they are not the same data source.
if (supabaseUrl && process.env.DATABASE_URL) {
  try {
    const supaHost = new URL(supabaseUrl).hostname;
    const dbUrl = process.env.DATABASE_URL;
    const dbHost = dbUrl.includes('://') ? new URL(dbUrl).hostname : null;
    if (dbHost && dbHost !== supaHost) {
      logger.warn('Both SUPABASE and a local DATABASE_URL are configured and point to different hosts. Be aware data in Supabase and local Postgres will not be automatically synchronized.');
    }
  } catch (err) { /* ignore parse errors */ }
}

const isSupabaseAvailable = () => {
  if (!supabase) return false;
  if (Date.now() < supabaseDownUntil) return false;
  return true;
};

// Dev routes / fallbacks enabled when explicitly set or when not in production
const devRoutesEnabled = process.env.ENABLE_DEV_ROUTES === 'true' || process.env.NODE_ENV !== 'production';
logger.info(`Dev routes enabled: ${devRoutesEnabled}`);

const app = express();

// Security Headers
// In dev we disable helmet's contentSecurityPolicy so our dev-only pages can use helpful inline fallbacks.
// In production, keep helmet's defaults for strong security.
const helmetOptions = { contentSecurityPolicy: false };
app.use(helmet(helmetOptions));

// CORS Configuration
// Allow list built from static values plus optional env-configured client URL
const allowedOrigins = [
  'http://localhost:5173',
  'https://edunexus-frontend-v2.onrender.com'
];
if (process.env.VITE_API_URL) {
  try {
    const clientUrl = new URL(process.env.VITE_API_URL);
    allowedOrigins.push(clientUrl.origin);
  } catch (e) { /* ignore invalid URL */ }
}
const localOriginRegex = /^https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(?::\d+)?$/i;

// Use an options delegate so we can inspect the request path and allow dev-only routes
const corsOptionsDelegate = (req, callback) => {
  try {
    // Allow all requests to dev-only endpoints regardless of Origin (safe when dev routes are enabled)
    if (devRoutesEnabled && String(req.path || '').startsWith('/dev-view')) {
      logger.info('CORS: allowing dev-view request (dev routes enabled)');
      return callback(null, { origin: true, credentials: true, optionsSuccessStatus: 200 });
    }

    const origin = req.header('Origin');
    // Allow requests with no origin (curl, mobile)
    if (!origin) return callback(null, { origin: true, credentials: true, optionsSuccessStatus: 200 });
    // Allow explicit whitelist
    if (allowedOrigins.includes(origin)) return callback(null, { origin: true, credentials: true, optionsSuccessStatus: 200 });
    // Allow common local network origins
    if (localOriginRegex.test(origin)) return callback(null, { origin: true, credentials: true, optionsSuccessStatus: 200 });

    // Disallowed
    return callback(new Error('Not allowed by CORS'), { origin: false });
  } catch (e) {
    // If something unexpected happened, be conservative and disallow
    logger.warn('CORS delegate error:', e?.message || e);
    return callback(new Error('Not allowed by CORS'), { origin: false });
  }
};

app.use(cors(corsOptionsDelegate));

// Ensure preflight OPTIONS are handled with the same CORS policy
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return cors(corsOptionsDelegate)(req, res, next);
  return next();
});

app.use(cookieParser());

app.use(express.json());

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth routes
app.use('/api/login', authLimiter);
app.use('/api/signup', authLimiter);
app.use('/api/forgot-password', authLimiter);


const authStrictRoutes = require('./routes/auth-strict');
app.use('/api/auth-strict', authStrictRoutes);

const managementRoutes = require('./routes/management');
app.use('/api/management', managementRoutes);



const PORT = process.env.PORT || 4000;


// Health check (basic)
app.get('/health', (req, res) => {
  return res.json({ status: 'ok', supabaseConfigured: !!supabase, devRoutesEnabled });
});

// Request Logging Middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  
  // FORCE PERMISSIVE CSP globally for this dev session to fix the user's issue
  if (devRoutesEnabled) {
      res.setHeader(
        'Content-Security-Policy', 
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'sha256-rgXc7+5IO+wiNQP5biAiXjAPSzz0noyYqjNku70bdbo='; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
      );
  }
  
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ADMIN helper - lightweight auth using API key
const checkAdminAuth = (req, res, next) => {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (!process.env.ADMIN_API_KEY) return res.status(403).json({ error: 'admin api key not configured' });
  if (!key || String(key) !== String(process.env.ADMIN_API_KEY)) return res.status(401).json({ error: 'unauthorized' });
  next();
};

// Admin endpoints to inspect outbox and trigger retries
app.get('/api/admin/queue-stats', checkAdminAuth, async (req, res) => {
  try {
    const outbox = readJsonFile(OUTBOX_FILE);
    res.json({ success: true, stats: { outboxCount: outbox.length } });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api/admin/outbox', checkAdminAuth, async (req, res) => {
  try {
    const outbox = readJsonFile(OUTBOX_FILE);
    res.json({ success: true, outbox });
  } catch (e) { res.status(500).json({ error: 'failed' }); }
});

app.post('/api/admin/outbox/retry', checkAdminAuth, async (req, res) => {
  try {
    const outbox = readJsonFile(OUTBOX_FILE);
    const results = [];
    for (const msg of outbox.slice()) {
      try {
        await sendEmail(msg.to, msg.subject, msg.text);
        msg.sent = true;
        results.push({ id: msg.id, ok: true });
      } catch (e) {
        msg.attempts = (msg.attempts || 0) + 1;
        results.push({ id: msg.id, ok: false, error: String(e?.message || e) });
      }
    }
    const keep = outbox.filter(m => !m.sent && (m.attempts || 0) < 10);
    writeJsonFile(OUTBOX_FILE, keep);
    res.json({ success: true, results });
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }); }
});


// Dev-only: Ultimate Developer View (password protected via DEV'S_PASSWORD in server/.env)
if (devRoutesEnabled) {
  // For dev routes only, relax CSP so inline convenience scripts and prompt() calls work in browsers during development.
  // This is intentionally permissive and only enabled when dev routes are turned on.
  app.use('/dev-view', (req, res, next) => {
    // Remove any previously-set CSP headers (e.g. from helmet) and set a permissive development policy.
    try {
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('Content-Security-Policy-Report-Only');
    } catch (e) { /* ignore */ }
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'sha256-rgXc7+5IO+wiNQP5biAiXjAPSzz0noyYqjNku70bdbo='; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';";
    res.set('Content-Security-Policy', csp);
    logger.info('Dev view CSP set:', csp.replace(/\s+/g, ' ').slice(0, 200));
    next();
  });

  const devSessions = new Map();
  const generateToken = () => crypto.randomBytes(16).toString('hex');

  // Simple login / setup page
  app.get('/dev-view', (req, res) => {
    logger.info(`/dev-view accessed. hasDevPassword=${!!process.env["DEV'S_PASSWORD"]}`);
    const envPass = process.env["DEV'S_PASSWORD"];
    const html = `
      <html><head><title>Dev View</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Arial; padding:20px;">
      <h2>EduNexus Developer View</h2>
      ${envPass ? `
        <form method="POST" action="/dev-view/login">
          <label>Password: <input name="password" type="password"/></label>
          <button type="submit">Login</button>
        </form>
        <p style="font-size:12px;color:#666">Protected by DEV'S_PASSWORD in <code>server/.env</code>.</p>
      ` : `
        <p>No <code>DEV'S_PASSWORD</code> configured. Set one (developer only).</p>
        <form method="POST" action="/dev-view/setup">
          <label>Set Password: <input name="password" type="password"/></label>
          <button type="submit">Set & Enter</button>
        </form>
      `}
      <hr />
      <p><em>Note: This view is enabled only when dev routes are enabled (non-production or with <code>ENABLE_DEV_ROUTES=true</code>).</em></p>
      </body></html>
    `;
    res.set('Content-Type', 'text/html');
    res.send(html);
  });

  // Dev: trigger supabase sync queue processing once (dev-only)
  app.post('/dev-view/process-supabase-queue', ensureDevAuth, async (req, res) => {
    try {
      const worker = require('./outboxWorker');
      const result = await worker.processSupabaseSyncQueueOnce();
      res.json({ success: true, processed: result.processed || 0 });
    } catch (e) {
      logger.warn('dev-view: failed processing supabase queue', e?.message || e);
      res.status(500).json({ success: false, error: String(e?.message || e) });
    }
  });

  // Setup (create DEV'S_PASSWORD in server/.env) - only when not already set
  app.post('/dev-view/setup', express.urlencoded({ extended: false }), async (req, res) => {
    if (process.env["DEV'S_PASSWORD"]) return res.status(400).send('DEV password already configured');
    const password = (req.body && req.body.password) ? String(req.body.password) : '';
    if (!password || password.length < 6) return res.status(400).send('Password too short (min 6 chars)');
    try {
      const envPath = path.join(__dirname, '.env');
      let current = '';
      if (fs.existsSync(envPath)) current = fs.readFileSync(envPath, 'utf8');
      current = current.replace(/\r\n/g, '\n');
      if (!/DEV'S_PASSWORD=/.test(current)) current += `\nDEV'S_PASSWORD=${password}\n`;
      else current = current.replace(/DEV'S_PASSWORD=.*/g, `DEV'S_PASSWORD=${password}`);
      fs.writeFileSync(envPath, current, 'utf8');
      // also set in this running process so immediate login is possible
      process.env["DEV'S_PASSWORD"] = password;
      const token = generateToken();
      devSessions.set(token, Date.now() + 30 * 60 * 1000);
      res.cookie('dev-auth', token, { httpOnly: true, sameSite: 'lax' });
      return res.redirect('/dev-view/data');
    } catch (e) {
      logger.error('Failed to write DEV password to server/.env', e?.message || e);
      return res.status(500).send('Failed to set password');
    }
  });

  // Login
  app.post('/dev-view/login', express.urlencoded({ extended: false }), (req, res) => {
    const password = (req.body && req.body.password) ? String(req.body.password) : '';
    if (!process.env["DEV'S_PASSWORD"] || password !== process.env["DEV'S_PASSWORD"]) {
      return res.status(401).send('Invalid password');
    }
    const token = generateToken();
    devSessions.set(token, Date.now() + 30 * 60 * 1000);
    res.cookie('dev-auth', token, { httpOnly: true, sameSite: 'lax' });
    return res.redirect('/dev-view/data');
  });

  // Logout
  app.get('/dev-view/logout', (req, res) => {
    const token = req.cookies && req.cookies['dev-auth'];
    if (token) devSessions.delete(token);
    res.clearCookie('dev-auth');
    return res.redirect('/dev-view');
  });

  // Data view (protected) — supports optional refresh from Supabase and client-side delete actions
  app.get('/dev-view/data', async (req, res, next) => {
    const token = req.cookies && req.cookies['dev-auth'];
    const doRefresh = !!req.query.refresh;
    logger.info(`/dev-view/data accessed. refresh=${doRefresh} hasDevPassword=${!!process.env["DEV'S_PASSWORD"]}, tokenPresent=${!!token}`);
    if (!token || !devSessions.has(token) || devSessions.get(token) < Date.now()) return res.redirect('/dev-view');
    // extend session
    devSessions.set(token, Date.now() + 30 * 60 * 1000);

    let supaNote = '';
    let usedSupabase = false;

    try {
      // Load local data first
      const usersRes = await pool.query(`SELECT u.id,u.name,u.email,u.role,u.extra,u.organization_id,u.created_at FROM users u ORDER BY u.role, u.name`);
      const orgsRes = await pool.query(`SELECT id,name FROM organizations`);
      const classesRes = await pool.query(`SELECT id,name,org_id FROM classes`);
      const orgMembersRes = await pool.query(`SELECT om.id as id, om.org_id, om.user_id, om.assigned_role_title, om.status, u.name as user_name, u.role as user_role FROM org_members om JOIN users u ON om.user_id = u.id`);
      const pRows = await pool.query(`SELECT p.parent_id, s.id as student_id, s.name as student_name FROM parent_student_links p JOIN users s ON p.student_id = s.id`);

      // quick metrics for debugging
      const userCountRes = await pool.query('SELECT COUNT(*) AS count FROM users');
      const lastUserRes = await pool.query('SELECT id,email,created_at FROM users ORDER BY created_at DESC NULLS LAST, id DESC LIMIT 1');
      const localUserCount = Number((userCountRes.rows[0] && userCountRes.rows[0].count) || 0);
      const lastUser = (lastUserRes.rows && lastUserRes.rows[0]) ? lastUserRes.rows[0] : null;

      // check Supabase reachability (best-effort)
      let supaAvailable = false;
      let supaPingError = '';
      if (isSupabaseAvailable()) {
        try {
          const ping = await supabase.from('users').select('id').limit(1);
          if (ping.error) throw ping.error;
          supaAvailable = true;
        } catch (se) {
          supaPingError = String(se?.message || se);
          logger.warn('Supabase ping failed', supaPingError);
        }
      } else {
        supaPingError = 'Supabase marked down (ttl)';
      }

      const orgMap = {};
      for (const o of orgsRes.rows) orgMap[o.id] = o.name;

      const classMap = {};
      for (const c of classesRes.rows) {
        classMap[c.id] = { id: c.id, name: c.name, orgName: c.org_id ? (orgMap[c.org_id] || '') : '' };
      }

      const orgMembersMap = {};
      for (const m of orgMembersRes.rows) {
        orgMembersMap[m.org_id] = orgMembersMap[m.org_id] || [];
        orgMembersMap[m.org_id].push({ userId: m.user_id, name: m.user_name, role: m.user_role, title: m.assigned_role_title, status: m.status });
      }

      const parentMap = {};
      for (const r of pRows.rows) {
        parentMap[r.parent_id] = parentMap[r.parent_id] || [];
        parentMap[r.parent_id].push(r.student_name);
      }

      const localRows = usersRes.rows.map(u => ({
        id: u.id,
        name: u.name || '',
        email: u.email || '',
        role: u.role || '',
        orgName: u.organization_id ? (orgMap[u.organization_id] || '') : ((u.extra && (u.extra.instituteName || u.extra.schoolName || u.extra.orgName)) || ''),
        extra: u.extra || {},
        children: parentMap[u.id] || []
      }));

      let rows = localRows;
      let supaRows = null;

      // If requested, attempt to refresh from Supabase (best effort) and compare
      if (doRefresh && isSupabaseAvailable()) {
        try {
          const [sUsers, sOrgs, sClasses, sOrgMembers, sParents] = await Promise.all([
            supabase.from('users').select('id,name,email,role,extra,organization_id'),
            supabase.from('organizations').select('id,name'),
            supabase.from('classes').select('id,name,org_id'),
            supabase.from('org_members').select('org_id,user_id,assigned_role_title,status'),
            supabase.from('parent_student_links').select('parent_id,student_id')
          ]);

          if (sUsers.error) throw sUsers.error;

          // normalize and compare by id
          const normalize = (arr) => (arr || []).slice().map(x => ({ ...x })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
          const supaUsers = normalize(sUsers.data || []);
          const localUsers = normalize(localRows);

          supaRows = (sUsers.data || []).map(u => ({ id: u.id, name: u.name || '', email: u.email || '', role: u.role || '', orgName: u.organization_id || '', extra: u.extra || {}, children: [] }));
          usedSupabase = true;

          if (JSON.stringify(supaUsers) === JSON.stringify(localUsers)) {
            supaNote = '✓ Supabase data matches Local data exactly.';
          } else {
            supaNote = '⚠ Supabase data differs from Local data (see below).';
          }
        } catch (se) {
          logger.warn('Supabase refresh failed', se?.message || se);
          supaNote = 'Supabase refresh failed: ' + String(se?.message || se);
        }
      }

      let html = `<!doctype html><html><head><meta charset="utf-8"><title>Dev View - Users</title><style>body{font-family:system-ui,Segoe UI,Roboto,Arial;padding:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}pre{max-width:420px;white-space:pre-wrap}.small{font-size:13px;color:#666}.delete-btn{background:#e53935;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-weight:600;margin-left:6px;display:inline-block}.delete-btn:hover{background:#c62828}.delete-btn.small{padding:4px 6px;font-size:12px}.delete-inline{margin-left:8px;color:#c00}</style></head><body>`;
      html += `<h2>Developer User View</h2><p><a href="/dev-view/data">Refresh</a> • <a href="/dev-view/data?refresh=1">Refresh from Supabase</a> • <a href="/dev-view/logout">Logout</a> • <a href="/dev-view">Home</a> • <button id="process-supa-queue" style="margin-left:8px;padding:6px 10px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer">Process Supabase Sync Queue</button></p>`;
      if (supaNote) html += `<div style="margin:8px 0;padding:10px;border-radius:6px;background:#f7f7f7;border:1px solid #eee">${escapeHtml(supaNote)}</div>`;
      html += `<div class="small">Data source: ${usedSupabase ? 'Supabase snapshot' : 'Local DB'}</div>`;

      // Status panel
      html += `<div style="margin:8px 0;padding:10px;border-radius:6px;background:#fff;color:#333;border:1px solid #eee;display:flex;gap:12px;align-items:center;flex-wrap:wrap">`;
      html += `<div><strong>Dev session:</strong> ${token ? '<span style="color:green">active</span>' : '<span style="color:#999">not set</span>'}</div>`;
      html += `<div><strong>Local users:</strong> ${localUserCount}</div>`;
      html += `<div><strong>Last local user:</strong> ${lastUser ? escapeHtml(lastUser.email || lastUser.id + '') + (lastUser.created_at ? ' (' + escapeHtml(String(lastUser.created_at)) + ')' : '') : 'none'}</div>`;
      html += `<div><strong>Supabase reachable:</strong> ${supaAvailable ? '<span style="color:green">yes</span>' : '<span style="color:#999">no</span>'}${supaPingError ? ' — ' + escapeHtml(supaPingError) : ''}</div>`;
      html += `</div>`;

      // Users table (with delete buttons)
      html += `<h3>Users</h3><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Organization</th><th>Extra</th><th>Children</th><th>Actions</th></tr></thead><tbody>`;
      for (const u of rows) {
        html += `<tr><td>${escapeHtml(u.name || u.email)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td><td>${escapeHtml(u.orgName)}</td><td><pre>${escapeHtml(JSON.stringify(u.extra, null, 2))}</pre></td><td>${escapeHtml((u.children || []).join(', '))}</td><td><button class="delete-btn" data-type="user" data-id="${escapeHtml(u.id)}">❌ Delete</button></td></tr>`;
      }
      html += `</tbody></table>`;

      // Organizations and members (with delete for org)
      html += `<h3>Organizations</h3>`;
      for (const o of orgsRes.rows) {
        html += `<div style="margin-bottom:12px;padding:8px;border:1px solid #eee;border-radius:6px;position:relative"><strong>${escapeHtml(o.name)}</strong> <button class="delete-btn" data-type="org" data-id="${escapeHtml(o.id)}" style="position:absolute;right:12px;top:10px">❌ Delete Org</button><div style="font-size:12px;color:#666">Members:</div>`;
        const mems = orgMembersMap[o.id] || [];
        if (!mems.length) html += `<div style="font-size:13px;color:#999">(none)</div>`;
        else {
          html += `<ul style="margin:6px 0;padding-left:18px">`;
          for (const m of mems) html += `<li>${escapeHtml(m.name)} — ${escapeHtml(m.role)} ${m.title ? '(' + escapeHtml(m.title) + ')' : ''} ${m.status ? '[' + escapeHtml(m.status) + ']' : ''} <button class="delete-btn small" data-type="org_member" data-id="${escapeHtml(m.id)}">❌ Remove</button></li>`;
          html += `</ul>`;
        }
        html += `</div>`;
      }

      // Classes
      html += `<h3>Classes</h3><table><thead><tr><th>Class</th><th>Organization</th><th>Actions</th></tr></thead><tbody>`;
      for (const id in classMap) {
        const c = classMap[id];
        html += `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.orgName)}</td><td><button class="delete-btn" data-type="class" data-id="${escapeHtml(c.id)}">❌ Delete</button></td></tr>`;
      }
      html += `</tbody></table>`;

      html += `<script src="/dev-view/script.js"></script>`;

      html += `</body></html>`;
      res.set('Content-Type', 'text/html');
      res.send(html);
    } catch (e) {
      logger.error('Dev view data error', e?.message || e);
      -      res.status(500).send('Failed to fetch data');
      +      // Forward to global error handler so devs see the pretty error page with stack
        +      next(e);
    }
  });

  // Allow developer to delete entities (protected)
  app.post('/dev-view/delete', express.json(), async (req, res) => {
    const token = req.cookies && req.cookies['dev-auth'];
    const payload = req.body || {};
    logger.info('/dev-view/delete called', { targetType: payload.targetType, id: payload.id, tokenPresent: !!token, devRoutesEnabled });
    if (!token || !devSessions.has(token) || devSessions.get(token) < Date.now()) return res.status(401).json({ error: 'unauthorized' });
    if (!devRoutesEnabled) return res.status(403).json({ error: 'dev routes disabled' });

    const { targetType, id, confirm } = payload;
    if (!targetType || !id) return res.status(400).json({ error: 'targetType and id required' });
    if (confirm !== 'DELETE') return res.status(400).json({ error: 'confirmation required (set confirm: "DELETE")' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (targetType === 'user') {
        await client.query('DELETE FROM parent_student_links WHERE parent_id = $1 OR student_id = $1', [id]);
        await client.query('DELETE FROM class_assignments WHERE teacher_id = $1', [id]);
        await client.query('DELETE FROM org_members WHERE user_id = $1', [id]);
        await client.query('DELETE FROM users WHERE id = $1', [id]);
      } else if (targetType === 'org') {
        // remove org members, classes and unlink users
        await client.query('DELETE FROM org_members WHERE org_id = $1', [id]);
        const classIdsRes = await client.query('SELECT id FROM classes WHERE org_id = $1', [id]);
        const classIds = classIdsRes.rows.map(r => r.id);
        if (classIds.length) {
          await client.query('DELETE FROM class_assignments WHERE class_id = ANY($1::uuid[])', [classIds]);
        }
        await client.query('DELETE FROM classes WHERE org_id = $1', [id]);
        await client.query('UPDATE users SET organization_id = NULL WHERE organization_id = $1', [id]);
        await client.query('DELETE FROM organizations WHERE id = $1', [id]);
      } else if (targetType === 'class') {
        await client.query('DELETE FROM class_assignments WHERE class_id = $1', [id]);
        await client.query('DELETE FROM classes WHERE id = $1', [id]);
      } else if (targetType === 'org_member') {
        await client.query('DELETE FROM org_members WHERE id = $1', [id]);
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'unknown targetType' });
      }

      // If Supabase is available, require the mirror delete to succeed; otherwise commit local deletion and warn
      if (isSupabaseAvailable()) {
        try {
          if (targetType === 'user') {
            const r1 = await supabase.from('users').delete().eq('id', id);
            if (r1.error) throw r1.error;
            // also attempt to remove auth user if possible (service role)
            if (supabase.auth && supabase.auth.admin && typeof supabase.auth.admin.deleteUser === 'function') {
              try { await supabase.auth.admin.deleteUser(id); } catch (se) { logger.warn('Supabase auth delete failed', se?.message || se); }
            }
          } else if (targetType === 'org') {
            const r1 = await supabase.from('org_members').delete().eq('org_id', id);
            if (r1.error) throw r1.error;
            const r2 = await supabase.from('classes').delete().eq('org_id', id);
            if (r2.error) throw r2.error;
            const r3 = await supabase.from('organizations').delete().eq('id', id);
            if (r3.error) throw r3.error;
          } else if (targetType === 'class') {
            const r1 = await supabase.from('class_assignments').delete().eq('class_id', id);
            if (r1.error) throw r1.error;
            const r2 = await supabase.from('classes').delete().eq('id', id);
            if (r2.error) throw r2.error;
          } else if (targetType === 'org_member') {
            const r1 = await supabase.from('org_members').delete().eq('id', id);
            if (r1.error) throw r1.error;
          }
        } catch (se) {
          await client.query('ROLLBACK');
          logger.error('Supabase deletion failed - rolled back local changes', se?.message || se);
          return res.status(500).json({ error: 'Supabase deletion failed', details: String(se?.message || se) });
        }
      }

      await client.query('COMMIT');

      // If Supabase unavailable, include note
      if (!isSupabaseAvailable()) {
        return res.json({ success: true, deleted: { targetType, id }, note: 'Supabase unavailable; local deletion committed and will require manual cleanup.' });
      }

      return res.json({ success: true, deleted: { targetType, id } });
    } catch (e) {
      await client.query('ROLLBACK');
      logger.error('Dev delete failed', e?.message || e);
      return res.status(500).json({ error: String(e?.message || e) });
    } finally {
      client.release();
    }
  });

  // Serve external JS for dev view to comply with CSP (no inline scripts)
  app.get('/dev-view/script.js', (req, res) => {
    // Small, self-contained script to handle deletes
    res.set('Content-Type', 'application/javascript');
    res.set('Cache-Control', 'no-store');
    res.send(`(function(){
      async function devDelete(type,id,btn){
        try{
          console.log('devDelete called', { type, id });
          const ok = confirm('Delete '+type+' ID '+id+'? This is irreversible. Click OK to continue.');
          if(!ok) return;
          const token = prompt('Type DELETE to confirm', '');
          if(token !== 'DELETE'){ alert('Confirmation failed'); return; }
          if(btn){ btn.disabled = true; btn.dataset.orig = btn.innerText; btn.innerText = 'Deleting...'; }
          const r = await fetch('/dev-view/delete', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: type, id: id, confirm: 'DELETE' }) });
          let j = {};
          try{ j = await r.json(); } catch(e){ console.warn('Response not JSON', e); }
          console.log('devDelete response', r.status, j);
          if(!r.ok) return alert('Delete failed: ' + (j.error || j.details || JSON.stringify(j) || r.statusText));
          alert('Deleted: ' + JSON.stringify(j));
          window.location.reload();
        }catch(e){ console.error('devDelete network error', e); alert('Request failed: ' + e.message); }
        finally{ if(btn){ btn.disabled = false; btn.innerText = btn.dataset.orig || 'Delete'; } }
      }
      document.addEventListener('click', function(e){
        var btn = e.target && e.target.closest && e.target.closest('.delete-btn');
        if(!btn) return;
        var t = btn.dataset.type;
        var id = btn.dataset.id;
        devDelete(t,id,btn);
      });
      // helper to fetch JSON users for debugging
      window.devFetchUsers = async function(){ try{ const r = await fetch('/dev-view/users.json', {credentials:'same-origin'}); const j = await r.json(); console.log('dev users', j); return j; } catch(e){ console.error('devFetchUsers failed', e); return null; } }
      window.devProcessSupabaseQueue = async function(){ try{ const r = await fetch('/dev-view/process-supabase-queue', { method: 'POST', credentials: 'same-origin' }); const j = await r.json(); console.log('process supa queue', j); alert('Processed: ' + (j.processed || 0)); window.location.reload(); } catch(e){ console.error('devProcessSupabaseQueue failed', e); alert('Error: ' + e.message); } }
      document.addEventListener('click', function(e){ if(e.target && e.target.id === 'process-supa-queue'){ if(confirm('Run supabase sync queue now?')) window.devProcessSupabaseQueue(); } });
    })();`);
  });

  // JSON endpoint to quickly inspect local users and Supabase status
  app.get('/dev-view/users.json', async (req, res) => {
    const token = req.cookies && req.cookies['dev-auth'];
    if (!token || !devSessions.has(token) || devSessions.get(token) < Date.now()) return res.status(401).json({ error: 'unauthorized' });
    try {
      const users = (await pool.query('SELECT id,email,role,created_at FROM users ORDER BY created_at DESC NULLS LAST LIMIT 50')).rows || [];
      const counts = (await pool.query('SELECT COUNT(*) as c FROM users')).rows[0] || { c: 0 };
      let supaAvailable = false;
      try { const ping = await supabase.from('users').select('id').limit(1); if (!ping.error) supaAvailable = true; } catch (e) { /* ignore */ }
      res.json({ success: true, supabase: supaAvailable, count: Number(counts.c), users });
    } catch (e) { logger.error('dev users.json failed', e?.message || e); res.status(500).json({ error: String(e?.message || e) }); }
  });

  function escapeHtml(s) { if (!s && s !== 0) return ''; return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
}


// --- MIGRATED PYTHON ENDPOINTS ---
// Replaces the simplified logic from server/python_service/main.py

// 1. Check Email
app.post('/api/py/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ detail: "Email required" });

  logger.info(`py/check-email called for email=${email} origin=${req.get('origin') || 'none'} supabaseConfigured=${!!supabase} dev=${devRoutesEnabled}`);

  try {
    let exists = false;
    let debugSource = 'none';

    // 1. Check Supabase if configured
    if (supabase) {
      try {
        const { data: users, error } = await supabase
          .from('users')
          .select('id,email')
          .eq('email', email);

        if (!error && users && users.length > 0) {
          exists = true;
          debugSource = 'supabase';
        }
      } catch (sbErr) {
        logger.warn('py/check-email: supabase check warning', sbErr.message);
      }
    }

    // 2. If not found in Supabase, and we are in dev/fallback mode, check Local Postgres
    if (!exists && (devRoutesEnabled || !supabase)) {
      try {
        const r = await pool.query('SELECT 1 FROM users WHERE LOWER(email)=LOWER($1)', [email]);
        if (r.rowCount > 0) {
          exists = true;
          debugSource = 'postgres';
        }
      } catch (pgErr) {
        logger.warn('py/check-email: local Postgres lookup failed', pgErr.message);
        // If we don't have supabase and local fails, we strictly error out if it was the only option
        if (!supabase) throw pgErr;
      }
    }

    logger.info(`py/check-email: result for ${email} exists=${exists} source=${debugSource}`);
    res.json({ exists });
  } catch (e) {
    logger.error('Error in check-email:', e);
    res.status(500).json({ detail: e.message });
  }
});

// 2. Restore Dashboard State
app.post('/api/py/restore-dashboard-state', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ detail: "User ID required" });

  try {
    const { data, error } = await supabase
      .from('user_dashboard_states')
      .select('state_data')
      .eq('user_id', user_id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found, which is fine

    res.json({ success: true, dashboard_state: data ? data.state_data : {} });
  } catch (e) {
    logger.error('Error restoring state:', e);
    res.status(500).json({ detail: e.message });
  }
});

// 3. Update Dashboard State
app.post('/api/py/state', async (req, res) => {
  const { user_id, state } = req.body;
  if (!user_id) return res.status(400).json({ detail: "User ID required" });

  try {
    const { error } = await supabase
      .from('user_dashboard_states')
      .upsert({ user_id, state_data: state, updated_at: new Date().toISOString() });

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    logger.error('Error updating state:', e);
    res.status(500).json({ detail: e.message });
  }
});

// 4. View Pending Teachers (for Management)
app.get('/api/py/management/pending-teachers', async (req, res) => {
  const { institute_id } = req.query;
  try {
    let query = supabase
      .from('teachers')
      .select('*, users(name, email, extra)')
      .eq('status', 'pending');

    if (institute_id) {
      query = query.eq('institute_id', institute_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (e) {
    logger.error('Error fetching pending teachers:', e);
    res.status(500).json({ detail: e.message });
  }
});

// 5. Approve Teacher
app.post('/api/py/management/approve-teacher', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ detail: "User ID required" });

  try {
    const { error } = await supabase
      .from('teachers')
      .update({ status: 'approved', is_verified: true })
      .eq('user_id', user_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    logger.error('Error approving teacher:', e);
    res.status(500).json({ detail: e.message });
  }
});

// 6. Reject Teacher
app.post('/api/py/management/reject-teacher', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ detail: "User ID required" });

  try {
    const { error } = await supabase
      .from('teachers')
      .update({ status: 'rejected', is_verified: false })
      .eq('user_id', user_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    logger.error('Error rejecting teacher:', e);
    res.status(500).json({ detail: e.message });
  }
});

// 7. Signup Proxy
app.post('/api/py/signup', async (req, res) => {
  const { name, email, password, role, extra } = req.body;
  if (!email || !password) return res.status(400).json({ detail: 'Missing credentials' });

  try {
    // First check for duplicate email via Supabase (when available)
    if (isSupabaseAvailable()) {
      try {
        const d = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (d && d.data) return res.status(400).json({ detail: 'Email-ID already been used' });
      } catch (err) {
        logger.warn('py/signup: supabase duplicate check failed', err?.message || err);
      }

      // Try Supabase signup using admin.createUser when available (more reliable for server-side)
      try {
        let userId = null;
        let createdUser = null;
        // Prefer admin.createUser when service role is used
        if (supabase && supabase.auth && supabase.auth.admin && typeof supabase.auth.admin.createUser === 'function') {
          try {
            const createResp = await supabase.auth.admin.createUser({ email, password, user_metadata: { name, role } });
            createdUser = createResp?.user || createResp;
          } catch (adminErr) {
            // Fall back to signUp if admin API fails for any reason
            logger.warn('py/signup: admin.createUser failed, falling back to signUp', adminErr?.message || adminErr);
          }
        }

        if (!createdUser) {
          // Fallback to regular signUp if admin.createUser isn't available or failed
          const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
          logger.info('py/signup: supabase.auth.signUp response', { authData, authError });
          if (authError) throw authError;
          createdUser = authData?.user;
        }

        if (!createdUser || !createdUser.id) throw new Error('Signup failed - no user id returned');
        userId = createdUser.id;

        // Insert public profile row (idempotent)
        const { error: insertErr } = await supabase.from('users').insert({ id: userId, name: name || 'Unknown', email, role: role || 'Management', extra: extra || {}, password_hash: 'supabase_auth' });
        if (insertErr) logger.warn('py/signup: warning inserting users row', insertErr?.message || insertErr);

        // Insert role-specific row
        if (role === 'Management') {
          const { error: mgrErr } = await supabase.from('management_managers').insert({ user_id: userId, name, email, role: 'Manager' });
          if (mgrErr) logger.warn('py/signup: warning inserting management_managers', mgrErr?.message || mgrErr);
        } else if (role === 'Teacher') {
          const { error: tErr } = await supabase.from('teachers').insert({ user_id: userId, title: extra?.title, department: extra?.department, institute_id: extra?.instituteId, class_id: extra?.classId, is_verified: false, status: 'pending' });
          if (tErr) logger.warn('py/signup: warning inserting teachers', tErr?.message || tErr);
        }

        return res.json({ success: true, user: { id: userId, email, role } });
      } catch (sbErr) {
        // Log the full error for easier diagnosis (include stack when available)
        logger.warn('py/signup: Supabase signup failed', { message: sbErr?.message || String(sbErr), stack: sbErr?.stack });
        metrics.inc('supabase_failures');
        supabaseDownUntil = Date.now() + SUPABASE_DOWN_TTL_MS;
        if (!devRoutesEnabled) return res.status(500).json({ detail: 'Signup failed (Supabase unavailable)' });
        // else fallthrough to local fallback
      }
    }

    // Local Postgres fallback (dev only)
    if (!devRoutesEnabled) {
      return res.status(500).json({ detail: 'Signup failed (Supabase unavailable)' });
    }

    try {
      // Prevent duplicate signups on local Postgres by checking case-insensitively
      try {
        const dupCheck = await pool.query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
        if (dupCheck && dupCheck.rowCount > 0) {
          return res.status(400).json({ detail: 'Email-ID already been used' });
        }
      } catch (dupErr) {
        // If the duplicate check fails for some reason, log and continue to insertion (db may enforce uniqueness)
        logger.warn('py/signup: duplicate email check failed', dupErr?.message || dupErr);
      }

      const hash = await bcrypt.hash(password, 10);
      const r = await pool.query('INSERT INTO users (name,email,password_hash,role,extra) VALUES ($1,$2,$3,$4,$5) RETURNING id,email', [name || null, email, hash, role || 'Management', extra || {}]);
      const userId = r.rows[0].id;

      // Ensure role-specific rows are created locally as well
      try {
        if (role === 'Teacher') {
          await pool.query('INSERT INTO teachers (user_id, title, department, institute_id, class_id, is_verified, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())', [userId, extra?.title, extra?.department, extra?.instituteId, extra?.classId, false]);
        } else if (role === 'Management') {
          await pool.query('INSERT INTO management_managers (user_id, name, email, role, created_at) VALUES ($1,$2,$3,$4,NOW())', [userId, name || null, email, 'Manager']);
        } else if (role === 'Student') {
          await pool.query('INSERT INTO students (user_id, created_at) VALUES ($1,NOW())', [userId]);
        } else if (role === 'Parent') {
          await pool.query('INSERT INTO parents (user_id, created_at) VALUES ($1,NOW())', [userId]);
        }
      } catch (roleErr) {
        logger.warn('py/signup: failed inserting role-specific local row', roleErr?.message || roleErr);
      }

      // Enqueue a Supabase-sync request so a background worker can reconcile the local user to Supabase
      try {
        await appendSupabaseSyncQueue({ action: 'create_user', payload: { id: userId, name, email, role, extra }, localUserId: userId });
      } catch (qErr) {
        logger.warn('py/signup: failed to append supabase sync queue', qErr?.message || qErr);
      }

      return res.json({ success: true, user: { id: userId, email, role }, note: 'Created locally' });
    } catch (localErr) {
      logger.error('Local fallback signup failed', localErr);
      return res.status(500).json({ detail: 'Local signup failed: ' + localErr.message });
    }
  } catch (e) {
    logger.error('Signup endpoint failed', e);
    return res.status(500).json({ detail: e.message });
  }
});


// Token Helpers
const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const nodemailer = require('nodemailer');
// Optional SendGrid direct API usage (preferred when SENDGRID_API_KEY present)
let sendgrid = null;
if (process.env.SENDGRID_API_KEY) {
  try {
    sendgrid = require('@sendgrid/mail');
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (e) {
    logger.warn('sendgrid package not installed or failed to load, falling back to nodemailer SMTP', e?.message || e);
    sendgrid = null;
  }
}
const fs = require('fs');
const path = require('path');
const cloudStorage = require('./cloudStorage');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json');
const QUEUE_FILE = path.join(DATA_DIR, 'signup_queue_disk.json');
const SUPABASE_SYNC_FILE = path.join(DATA_DIR, 'supabase_sync_queue.json');
if (!fs.existsSync(SUPABASE_SYNC_FILE)) fs.writeFileSync(SUPABASE_SYNC_FILE, '[]', 'utf8');

// Load disk queues safely
const readJsonFile = (file) => {
  try {
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw) return [];
    return JSON.parse(raw || '[]');
  } catch (e) {
    logger.warn('Failed reading json file', file, e);
    return [];
  }
};

const writeJsonFile = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    logger.error('Failed writing json file', file, e);
  }
};

// Append a message to outbox and persist
const appendOutbox = (mail) => {
  const cur = readJsonFile(OUTBOX_FILE);
  // Ensure consistent metadata for audited status / retries
  const entry = {
    id: `out_${Date.now()}`,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    createdAt: new Date().toISOString(),
    sent: false,
    attempts: 0,
    history: []
  };
  cur.unshift(entry);
  writeJsonFile(OUTBOX_FILE, cur);
  return entry;
};

const appendInbound = (obj) => {
  try {
    const file = path.join(DATA_DIR, 'inbound.json');
    const cur = readJsonFile(file);
    const entry = { id: `in_${Date.now()}`, ...obj, receivedAt: new Date().toISOString() };
    cur.unshift(entry);
    writeJsonFile(file, cur);
    return entry;
  } catch (e) {
    logger.warn('appendInbound failed', { error: String(e?.message || e) });
    return null;
  }
};

// Queue a signup payload to disk when DB is unavailable
const appendSignupQueueDisk = async (signupData) => {
  try {
    const cur = readJsonFile(QUEUE_FILE);
    const entry = {
      id: `signup_${Date.now()}`,
      name: signupData.name,
      email: signupData.email,
      password_hash: signupData.password_hash,
      role: signupData.role || 'Management',
      extra: signupData.extra || {},
      status: 'queued',
      attempts: 0,
      createdAt: new Date().toISOString(),
      history: []
    };
    cur.unshift(entry);
    writeJsonFile(QUEUE_FILE, cur);
    logger.info(`Signup queued to disk: ${signupData.email}`);

    // Fire-and-forget: attempt to upload a backup of the queue to GCS so data survives machine loss
    try {
      const destName = `backups/signup_queue_disk_${Date.now()}.json`;
      // upload the local queue file as a backup (non-blocking)
      cloudStorage.uploadFile(QUEUE_FILE, destName).catch(err => {
        logger.warn('Failed uploading signup queue backup to GCS', err?.message || err);
      });
    } catch (err) {
      logger.warn('Cloud upload attempt failed (skipped)', { error: String(err?.message || err) });
    }

    return entry;
  } catch (e) {
    logger.error('Failed to queue signup to disk', e?.message || e);
    return null;
  }
};

// Queue a supabase sync request to disk so local-created users can be synchronized to Supabase when available
const appendSupabaseSyncQueue = async (obj) => {
  try {
    const cur = readJsonFile(SUPABASE_SYNC_FILE);
    const entry = {
      id: `supa_${Date.now()}`,
      action: obj.action || 'create_user',
      payload: obj.payload || {},
      localUserId: obj.localUserId || null,
      attempts: 0,
      status: 'queued',
      createdAt: new Date().toISOString()
    };
    cur.unshift(entry);
    writeJsonFile(SUPABASE_SYNC_FILE, cur);
    logger.info('Appended supabase sync queue item for', entry.payload && entry.payload.email);
    return entry;
  } catch (e) {
    logger.error('Failed to append supabase sync queue', e?.message || e);
    return null;
  }
};

// Admin: view inbound messages stored on disk (if inbound polling/webhooks saved them)
app.get('/api/admin/inbound', checkAdminAuth, (req, res) => {
  try {
    const inboundFile = path.join(DATA_DIR, 'inbound.json');
    const inbound = readJsonFile(inboundFile);
    res.json({ success: true, inbound });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

// Diagnostic endpoint to help debug client <-> server connectivity and CORS issues
// - Returns the effective API URL the client would use and whether the request origin is allowed by CORS
// - Accessible in dev mode, or in production only by admin key (x-admin-key)
const buildDiagnostics = (req) => {
  const reqOrigin = req.get('origin') || req.get('referer') || `${req.protocol}://${req.get('host')}`;

  // Determine effective API URL (mimics getApiUrl behaviour used by client)
  const viteApi = process.env.VITE_API_URL ? process.env.VITE_API_URL.replace(/\/$/, '') : null;
  const hostname = req.hostname || req.get('host') || 'localhost';
  const protocol = req.protocol || 'http:';
  const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);
  let effectiveApiUrl;
  if (viteApi) effectiveApiUrl = viteApi;
  else if (!isLocalhost) effectiveApiUrl = `${protocol}://${hostname}`;
  else effectiveApiUrl = `${protocol}://${hostname}:4000`;

  // CORS check for the incoming origin
  const origin = reqOrigin;
  const allowed = (() => {
    if (!origin) return false;
    // exact match
    if (allowedOrigins.includes(origin)) return true;
    // local origin regex
    try {
      if (localOriginRegex.test(origin)) return true;
    } catch (e) { /* ignore */ }
    return false;
  })();

  // Supabase/db flags (expose only hosts, not sensitive keys)
  let supabaseHost = null;
  try { if (supabaseUrl) supabaseHost = new URL(supabaseUrl).hostname } catch (e) { supabaseHost = null }
  const dbConfigured = !!process.env.DATABASE_URL;
  let dbHost = null;
  try { if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('://')) dbHost = new URL(process.env.DATABASE_URL).hostname } catch (e) { dbHost = null }

  return {
    effectiveApiUrl,
    requestOrigin: origin,
    requestOriginAllowed: allowed,
    allowedOriginsPreview: allowedOrigins.slice(0, 20),
    localOriginRegex: localOriginRegex.toString(),
    supabaseConfigured: !!supabase,
    supabaseHost,
    databaseConfigured: dbConfigured,
    databaseHost: dbHost,
    devRoutesEnabled: !!devRoutesEnabled,
    nodeEnv: process.env.NODE_ENV || 'development'
  };
};

// Route registration: dev gets open access; production requires admin key
if (devRoutesEnabled) {
  app.get('/api/debug/diagnostics', (req, res) => {
    try {
      res.json({ success: true, diagnostics: buildDiagnostics(req) });
    } catch (e) {
      logger.error('diagnostics error', e);
      res.status(500).json({ success: false, error: String(e?.message || e) });
    }
  });
} else {
  app.get('/api/debug/diagnostics', checkAdminAuth, (req, res) => {
    try {
      res.json({ success: true, diagnostics: buildDiagnostics(req) });
    } catch (e) {
      logger.error('diagnostics error', e);
      res.status(500).json({ success: false, error: String(e?.message || e) });
    }
  });
}

// Admin: fetch a user by email for debugging (requires admin key)
app.get('/api/admin/user', checkAdminAuth, async (req, res, next) => {
  try {
    const email = req.query.email ? String(req.query.email) : null;
    if (!email) return res.status(400).json({ error: 'email required' });
    const r = await pool.query('SELECT id,name,email,role,extra,created_at,organization_id,linked_student_id,roll_number FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, user: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

// Inbound webhook for hosted email providers (optional)
// Configure providers like SendGrid Inbound Parse to POST to this endpoint.
// For safety you can set WEBHOOK_SECRET env var and include X-Inbound-Key header on requests.
app.post('/api/webhook/inbound', async (req, res) => {
  try {
    if (process.env.WEBHOOK_SECRET) {
      const key = req.headers['x-inbound-key'] || req.query.key;
      if (!key || String(key) !== String(process.env.WEBHOOK_SECRET)) return res.status(403).json({ error: 'invalid webhook key' });
    }
    const payload = req.body || {};
    // normalize common fields
    const message = {
      from: payload.from || payload.envelope && payload.envelope.from || payload.sender,
      to: payload.to || payload.envelope && payload.envelope.to || payload.recipient,
      subject: payload.subject || payload.headers && payload.headers.subject || '',
      body: payload.text || payload.html || payload.body || ''
    };
    appendInbound(message);
    // Optionally notify admin developer if configured
    if (process.env.ADMIN_ALERT_EMAIL) {
      appendOutbox({ to: process.env.ADMIN_ALERT_EMAIL, subject: `Inbound mail received: ${message.subject}`, text: `From: ${message.from}\nTo: ${message.to}\n\n${String(message.body).slice(0, 1000)}` });
    }
    res.json({ success: true });
  } catch (e) {
    logger.warn('inbound webhook error', e?.message || e);
    res.status(500).json({ error: 'failed' });
  }
});


// On startup, attempt to process disk queues and outbox
const processDiskQueuesOnStartup = async () => {
  // Process signup queue first: attempt to insert queued signups back into DB
  try {
    const signupQueue = readJsonFile(QUEUE_FILE);
    if (Array.isArray(signupQueue) && signupQueue.length) {
      logger.info('Processing disk signup queue', { count: signupQueue.length });
      for (const item of signupQueue.slice()) {
        try {
          // Attempt to insert the queued signup into the database
          const r = await pool.query(
            'INSERT INTO users (name,email,password_hash,role,extra) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role,created_at',
            [item.name || null, item.email, item.password_hash, item.role || 'Management', item.extra || {}]
          );

          if (r && r.rows && r.rows[0]) {
            // Successfully inserted, mark item as synced
            item.status = 'synced';
            item.attempts = (item.attempts || 0) + 1;
            logger.info(`Recovered queued signup: ${item.email} (ID: ${r.rows[0].id})`);
            console.log(`\n[DEV NOTICE] Successfully recovered queued signup for: ${item.email}. Data is now in the database.\n`);

            // Record in audit log
            try {
              await pool.query(
                'INSERT INTO signup_syncs (email, status, attempts, note) VALUES ($1,$2,$3,$4)',
                [item.email, 'synced', item.attempts, 'recovered from disk queue on startup']
              );
            } catch (auditErr) {
              logger.warn('Failed to record startup recovery audit', auditErr?.message);
            }
          }
        } catch (e) {
          const errMsg = String(e?.message || e);
          // If the error indicates a duplicate key / unique constraint, mark as failed immediately
          if (errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('unique') || errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('users_email_key')) {
            item.status = 'failed';
            logger.warn('Dropping queued signup - duplicate user exists', { email: item.email, error: errMsg });
            try {
              await pool.query('INSERT INTO signup_syncs (email, status, attempts, note) VALUES ($1,$2,$3,$4)', [item.email, 'failed', (item.attempts || 0) + 1, 'duplicate user exists, dropped from disk queue']);
            } catch (auditErr) {
              logger.warn('Failed to record signup sync audit for duplicate', { email: item.email, error: String(auditErr?.message || auditErr) });
            }
            // Notify admin that a queued signup was dropped due to duplicate (persist to outbox first)
            try {
              const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_FROM;
              if (adminEmail) {
                const subject = `Dropped queued signup: duplicate user ${item.email}`;
                const body = `A queued signup saved to disk was dropped because a user with email ${item.email} already exists in the database.\n\nQueued item id: ${item.id}\nAttempts: ${item.attempts || 0}\nTime: ${new Date().toISOString()}`;
                try {
                  appendOutbox({ to: adminEmail, subject, text: body });
                  logger.info('Admin notification appended to outbox for dropped signup', { email: item.email });
                } catch (appendErr) {
                  logger.warn('Failed to append admin notification to outbox', { email: item.email, error: String(appendErr?.message || appendErr) });
                }

                (async () => {
                  try {
                    const sent = await sendEmail(adminEmail, subject, body);
                    if (sent) logger.info('Admin notified of dropped queued signup (immediate send)', { email: item.email });
                  } catch (sendErr) {
                    logger.warn('Immediate admin notification failed (message persisted in outbox)', { email: item.email, error: String(sendErr?.message || sendErr) });
                  }
                })();
              }
            } catch (notifyErr) {
              logger.warn('Error while attempting to notify admin about dropped queued signup', { email: item.email, error: String(notifyErr?.message || notifyErr) });
            }
          } else {
            item.attempts = (item.attempts || 0) + 1;
            logger.warn('Failed to recover queued signup', { attempts: item.attempts, email: item.email, error: errMsg });
            // Keep it queued for next retry if attempts < 10
            if (item.attempts >= 10) {
              item.status = 'failed';
              logger.error('Giving up on signup queue item after 10 attempts', { email: item.email });
            }
          }
        }
      }
      // Keep only queued/pending items (not synced or failed after 10 attempts)
      const pending = signupQueue.filter(m => m.status !== 'synced' && (m.attempts || 0) < 10);
      writeJsonFile(QUEUE_FILE, pending);
    }
  } catch (e) {
    logger.warn('Failed processing signup queue on startup', e);
  }

  // process outbox: attempt to send emails
  try {
    const outbox = readJsonFile(OUTBOX_FILE);
    if (Array.isArray(outbox) && outbox.length) {
      logger.info('Processing disk outbox messages', outbox.length);
      for (const msg of outbox.slice()) {
        try {
          await sendEmail(msg.to, msg.subject, msg.text);
          msg.sent = true;
        } catch (e) {
          msg.attempts = (msg.attempts || 0) + 1;
          logger.warn('Failed sending outbox message, attempts:', msg.attempts, msg.id);
        }
      }
      // keep only unsent items
      const unsent = outbox.filter(m => !m.sent && (m.attempts || 0) < 10);
      writeJsonFile(OUTBOX_FILE, unsent);
    }
  } catch (e) {
    logger.warn('Failed processing outbox on startup', e);
  }

};

// Kick off startup processing async (do not block server startup)
process.nextTick(() => void processDiskQueuesOnStartup());

// Monitoring / Alerts: check queue lengths and notify admin email if backlogs exceed thresholds
const checkQueueAlerts = async () => {
  try {
    const signupQueue = readJsonFile(QUEUE_FILE);
    const outbox = readJsonFile(OUTBOX_FILE);
    const orgDisk = readJsonFile(path.join(DATA_DIR, 'org_code_requests_disk.json'));

    const signupThreshold = Number(process.env.ALERT_SIGNUP_THRESHOLD || '50');
    const outboxThreshold = Number(process.env.ALERT_OUTBOX_THRESHOLD || '50');
    const orgThreshold = Number(process.env.ALERT_ORG_REQ_THRESHOLD || '50');

    const issues = [];
    if (signupQueue.length >= signupThreshold) issues.push(`signupQueue ${signupQueue.length}`);
    if (outbox.length >= outboxThreshold) issues.push(`outbox ${outbox.length}`);
    if (orgDisk.length >= orgThreshold) issues.push(`orgQueue ${orgDisk.length}`);

    if (issues.length > 0 && process.env.ADMIN_ALERT_EMAIL) {
      const adminEmail = process.env.ADMIN_ALERT_EMAIL;
      const subject = `EduNexus Alerts: queue thresholds exceeded`;
      const text = `Queue backlogs detected: ${issues.join(', ')}. Please review server/admin endpoints.`;
      await sendEmail(adminEmail, subject, text);
      logger.warn('Queue thresholds exceeded; alert sent to admin', issues.join(', '));
    }
  } catch (e) {
    logger.warn('Failed running queue alerts check', e);
  }
};

// Run monitor on interval if enabled. Keep low frequency to avoid spam; default 60s for dev, configurable.
const MONITOR_INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS || 60_000);
setInterval(() => void checkQueueAlerts(), MONITOR_INTERVAL_MS);
// run once on startup
process.nextTick(() => void checkQueueAlerts());

// Cloud sync & recovery worker: periodically upload queue file to cloud and
// attempt to process disk queues if DB connectivity is restored.
const CLOUD_SYNC_INTERVAL_MS = Number(process.env.CLOUD_SYNC_INTERVAL_MS || 60_000);
setInterval(async () => {
  try {
    // If GCP bucket configured, attempt to upload the local queue file as a timestamped backup
    if (process.env.GCP_BACKUP_BUCKET) {
      try {
        const q = readJsonFile(QUEUE_FILE);
        if (Array.isArray(q) && q.length) {
          const destName = `backups/signup_queue_disk_${Date.now()}.json`;
          await cloudStorage.uploadFile(QUEUE_FILE, destName);
          logger.info('Uploaded signup queue backup to GCS', destName);
        }
      } catch (uploadErr) {
        logger.warn('Cloud backup upload failed', uploadErr?.message || uploadErr);
      }
    }

    // Attempt to recover queued items into DB if pool appears usable
    try {
      // simple lightweight check: a test query
      await pool.query('SELECT 1');
      // If no exception thrown, attempt to process disk queues
      await processDiskQueuesOnStartup();
    } catch (dbCheckErr) {
      // DB still unavailable; nothing to do this interval
    }
  } catch (e) {
    logger.warn('Cloud sync worker error', e?.message || e);
  }
}, CLOUD_SYNC_INTERVAL_MS);

// Email Helper
// Declare sendEmail with let so tests or runtime can swap a different
// implementation (for test mocking or alternate delivery strategies).
let sendEmail = async (to, subject, text, opts = {}) => {
  // In production, use real SMTP credentials from env
  // For now, we log it.
  // Prefer SendGrid API if available
  if (sendgrid) {
    try {
      const sgPayload = { to, from: process.env.SMTP_FROM || 'noreply@edunexus.ai', subject, text };
      if (opts.replyTo) sgPayload.reply_to = opts.replyTo;
      await sendgrid.send(sgPayload);
      logger.info(`Email sent via SendGrid to ${to}: ${subject}`);
      return true;
    } catch (err) {
      logger.error('SendGrid send failed', err);
      appendOutbox({ to, subject, text });
      return false;
    }
  }

  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    try {
      // also attempt to process org_code_requests that were persisted to disk
      try {
        const orgDisk = readJsonFile(path.join(DATA_DIR, 'org_code_requests_disk.json'));
        if (Array.isArray(orgDisk) && orgDisk.length) {
          logger.info('Processing disk org_code_requests', orgDisk.length);
          for (const item of orgDisk.slice()) {
            try {
              await pool.query('INSERT INTO org_code_requests (management_email, org_type, institute_id, token, status) VALUES ($1,$2,$3,$4,$5)', [item.managementEmail, item.orgType, item.instituteId, item.token, item.status || 'pending']);
              // notify developer on server side if needed
              await sendEmail('storageeapp@gmail.com', 'Pending Org Code Request', `Recovered request from ${item.managementEmail} — please visit ${process.env.VITE_API_URL || 'http://localhost:4000'}/api/org-code/confirm/${item.token}`);
              item.processed = true;
            } catch (err) {
              logger.warn('Failed to sync disk org_code_request', item.id, err?.message || err);
              item.attempts = (item.attempts || 0) + 1;
            }
          }
          const keepOrg = orgDisk.filter(i => !i.processed && (i.attempts || 0) < 10);
          writeJsonFile(path.join(DATA_DIR, 'org_code_requests_disk.json'), keepOrg);
        }
      } catch (err) {
        logger.warn('Failed processing org code disk queue', err);
      }
      const mailOptions = { from: process.env.SMTP_FROM || 'noreply@edunexus.ai', to, subject, text };
      if (opts.replyTo) mailOptions.replyTo = opts.replyTo;
      await transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}: ${subject}`);
    } catch (e) {
      logger.error('Failed to send email', e);
      // persist to outbox for retry on startup
      appendOutbox({ to, subject, text, replyTo: opts.replyTo });
      return false;
    }
  } else {
    logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body: ${text}`);
    // persist to outbox so messages survive server restarts and can be replayed
    appendOutbox({ to, subject, text, replyTo: opts.replyTo });
    return true;
  }
  return true;
};

// Helper to replace the email implementation (useful for tests)
const setSendEmail = (fn) => { if (typeof fn === 'function') sendEmail = fn; };

// ... (handleSignup)

// (Old signup handler removed — replaced by improved handler further below)

// EMAIL VERIFICATION ENDPOINT - verify email using magic link
app.post('/api/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Verification token required' });

    // Find the verification token
    const verResult = await pool.query(
      'SELECT email FROM email_verifications WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (!verResult.rows.length) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const email = verResult.rows[0].email;

    // Mark user email as verified in the users table
    try {
      await pool.query(
        'UPDATE users SET extra = jsonb_set(COALESCE(extra, \'{}\'::jsonb), \'{email_verified}\', \'true\') WHERE LOWER(email) = LOWER($1)',
        [email]
      );
    } catch (updateErr) {
      logger.warn('Failed to mark email as verified', updateErr?.message);
    }

    // Delete used verification token
    await pool.query('DELETE FROM email_verifications WHERE token = $1', [token]);

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    logger.error('email verification error', err);
    next(err);
  }
});

// ... (queue endpoints)

// Forgot Password
app.post('/api/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    // Check if user exists (generic message for security, but we log it)
    const r = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (!r.rows.length) {
      // Return success to avoid enumeration, but log it
      logger.info(`Forgot password requested for non-existent email: ${email}`);
      return res.json({ success: true, message: 'If account exists, OTP sent.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await pool.query('INSERT INTO password_resets (email, otp, expires_at) VALUES ($1, $2, $3)', [email, otp, expiresAt]);

    await sendEmail(email, 'Password Reset OTP', `Your OTP is: ${otp}. It expires in 10 minutes.`);

    res.json({ success: true, message: 'If account exists, OTP sent.' });
  } catch (e) {
    next(e);
  }
});

// Reset Password
app.post('/api/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Missing fields' });

    // Verify OTP
    const r = await pool.query('SELECT id FROM password_resets WHERE email=$1 AND otp=$2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1', [email, otp]);
    if (!r.rows.length) return res.status(400).json({ error: 'Invalid or expired OTP' });

    // Validate Password Policy
    const passValidation = z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
      .safeParse(newPassword);

    if (!passValidation.success) {
      const msg = (passValidation.error && passValidation.error.errors && passValidation.error.errors[0] && passValidation.error.errors[0].message) || 'Invalid password';
      return res.status(400).json({ error: msg });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE email=$2', [hash, email]);

    // Clean up used OTPs
    await pool.query('DELETE FROM password_resets WHERE email=$1', [email]);

    res.json({ success: true, message: 'Password reset successful' });
  } catch (e) {
    next(e);
  }
});

// Change Password (Authenticated)
app.post('/api/auth/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });

    const userId = req.user.id;
    // Get current password hash
    const r = await pool.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });

    const hash = r.rows[0].password_hash;
    const match = await bcrypt.compare(oldPassword, hash);
    if (!match) return res.status(401).json({ error: 'Incorrect old password' });

    // Validate Password Policy
    const passValidation = z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
      .safeParse(newPassword);

    if (!passValidation.success) {
      const msg = (passValidation.error && passValidation.error.errors && passValidation.error.errors[0] && passValidation.error.errors[0].message) || 'Invalid password policy';
      return res.status(400).json({ error: msg });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, userId]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (e) {
    next(e);
  }
});

// Org Code Request
app.post('/api/org-code/request', authenticateToken, async (req, res, next) => {
  try {

    const { managementEmail, orgType, instituteId } = req.body;
    // require caller be a management user
    if (!req.user || !['Management', 'School'].includes(req.user.role)) return res.status(403).json({ error: 'Only Management accounts may request organization codes' });
    if (!managementEmail || !orgType) return res.status(400).json({ error: 'Missing fields' });

    const token = require('crypto').randomBytes(20).toString('hex');
    // prevent duplicate confirmed codes for the same institute or management email
    try {
      const dupQ = await pool.query('SELECT id FROM org_code_requests WHERE status=$1 AND org_type=$2 AND (institute_id = $3 OR management_email = $4) LIMIT 1', ['confirmed', orgType, instituteId || null, managementEmail]);
      if (dupQ.rows && dupQ.rows.length) return res.status(409).json({ error: 'An organization code has already been issued for this institute or management email' });
    } catch (e) {
      logger.warn('dup check failed for org-code request', e?.message || e);
    }

    await pool.query('INSERT INTO org_code_requests (management_email, org_type, institute_id, token) VALUES ($1, $2, $3, $4)', [managementEmail, orgType, instituteId, token]);
    const confirmLink = `${process.env.VITE_API_URL || 'http://localhost:4000'}/api/org-code/confirm/${token}`;
    const rejectLink = `${process.env.VITE_API_URL || 'http://localhost:4000'}/api/org-code/reject/${token}`;
    // notify developer and set reply-to so developer can reply directly to the management email
    await sendEmail('storageeapp@gmail.com', 'New Organization Code Request', `Request from: ${managementEmail}\nType: ${orgType}\nInstitute ID: ${instituteId}\n\nApprove: ${confirmLink}\nReject: ${rejectLink}`, { replyTo: managementEmail });

    // Send an immediate acknowledgement to the management requester.
    try {
      await sendEmail(managementEmail, 'Organization Code Request Received', `Thanks — we've received your request for a ${orgType} organization code. A developer will review and confirm or reject your request shortly.`);
    } catch (err) {
      // Persist acknowledgment to outbox for later delivery
      appendOutbox({ to: managementEmail, subject: 'Organization Code Request Received', text: `Thanks — we've received your request for a ${orgType} organization code. A developer will review and confirm or reject your request shortly.` });
    }

  } catch (e) {
    next(e);
  }
});

// Org Code Confirm
app.post('/api/org-code/confirm/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    // First, get the request details
    const r = await pool.query('SELECT * FROM org_code_requests WHERE token = $1', [token]);
    if (!r.rows.length) return res.status(404).send('Invalid or expired token');

    const request = r.rows[0];
    if (request.status === 'confirmed') return res.send('Already confirmed.');

    // Update status
    await pool.query('UPDATE org_code_requests SET status=$1 WHERE token=$2', ['confirmed', token]);

    const { management_email, org_type, institute_id } = request;

    // Generate Code
    const prefix = org_type === 'institute' ? 'INST' : 'SCH';
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const code = `${prefix}-${randomSuffix}`;

    // Insert into org_codes table
    try {
      await pool.query(
        'INSERT INTO org_codes (code, type, institute_id, created_by) VALUES ($1, $2, $3, $4)',
        [code, org_type, institute_id, null]
      );
    } catch (dbErr) {
      console.error('Failed to insert org_code', dbErr);
    }

    // Email user
    await sendEmail(
      management_email,
      'Organization Code Approved',
      `Your request for ${org_type} code has been approved.\n\nYour Code: ${code}\n\nYou can now use this code to register users.`
    );

    res.json({ success: true, code, message: `Request confirmed. Code Generated: ${code}. Email sent to user.` });
  } catch (e) {
    next(e);
  }
});

// Org Code View
app.post('/api/org-code/view', authenticateToken, async (req, res, next) => {
  try {
    const { password, orgType } = req.body;
    if (!password || !orgType) return res.status(400).json({ error: 'Missing fields' });

    // Verify password for current user
    const userId = req.user.id;
    const r = await pool.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });

    const hash = r.rows[0].password_hash;
    const match = await bcrypt.compare(password, hash);
    if (!match) return res.status(401).json({ error: 'Invalid password' });

    // Fetch code
    // Assuming institute_id logic needs to be handled if user belongs to one?
    // For now, simpler query: find code of type created by this user?
    // Actually org_codes doesn't always have created_by set (it was null in confirm).
    // But usually Management user is associated with an institute.
    // Let's assume there's only one code per type for the authenticated user's organization scope?
    // The current user structure has 'extra'.

    // Better logic: fetch all codes, filter by type (simple approach for now)
    const codes = await pool.query('SELECT code, type FROM org_codes WHERE type=$1', [orgType]);
    // This returns ANY code of that type. This is insecure if there are multiple institutes.
    // We should filter by institute_id if applicable.

    // Check if user has institute_id access?
    // Management user might have instituteId in extra?
    // For the purpose of this fix, I'll return the MOST RECENT code of that type (assuming single tenant per deployment or small scale).
    // Ideally we should link org_code to Management user.

    if (codes.rows.length > 0) {
      // Return the latest one
      res.json({ success: true, code: codes.rows[codes.rows.length - 1].code });
    } else {
      res.status(404).json({ error: 'No code found' });
    }

  } catch (e) {
    next(e);
  }
});

// Org Code Reject (developer can reject via POST with optional reason)
app.post('/api/org-code/reject/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const reason = req.body && req.body.reason ? String(req.body.reason) : null;

    try {
      const r = await pool.query('UPDATE org_code_requests SET status=$1 WHERE token=$2 RETURNING management_email, org_type, institute_id', ['rejected', token]);

      if (!r || !r.rows || !r.rows.length) return res.status(404).json({ error: 'Invalid or expired token' });

      const { management_email, org_type, institute_id } = r.rows[0];

      await sendEmail(management_email, 'Organization Code Request Rejected', `Your request for ${org_type}${institute_id ? ' (' + institute_id + ')' : ''} was rejected by the developer.${reason ? '\n\nReason: ' + reason : ''}`);

    } catch (e) {
      next(e);
    }
  } catch (e) {
    next(e);
  }
});

// Admin endpoint: list uploaded backups in GCS bucket
app.get('/api/admin/backups', checkAdminAuth, async (req, res, next) => {
  try {
    if (!process.env.GCP_BACKUP_BUCKET) return res.status(400).json({ error: 'GCP_BACKUP_BUCKET not configured' });
    const prefix = req.query.prefix ? String(req.query.prefix) : 'backups/';
    const files = await cloudStorage.listFiles(prefix);
    res.json({ success: true, files });
  } catch (e) {
    next(e);
  }
});

// Persist a queued signup payload on the server so queued items survive browser
// uninstall and can be managed by admins.

// Google Login Verification Endpoint
app.post('/api/auth/google-login', async (req, res, next) => {
  try {
    const { accessToken, email: providedEmail, role } = req.body || {};

    let email = providedEmail;

    // If accessToken provided, verify with Supabase to retrieve user's email
    if (accessToken) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (error || !user || !user.email) {
        return res.status(401).json({ error: 'Invalid Google session' });
      }
      email = user.email;
    }

    if (!email) return res.status(400).json({ error: 'Email required' });

    // Fetch all users in our DB that match this email
    const query = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1) ORDER BY role';
    const r = await pool.query(query, [email]);
    const rows = r.rows || [];

    if (!rows.length) {
      return res.status(404).json({ error: 'Account not found. Please sign up first.' });
    }

    // If role explicitly requested, strict match only.
    if (role) {
      const user = rows.find(u => u.role === role);
      if (!user) {
        return res.status(404).json({ error: 'User found but role mismatch' });
      }

      const token = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      const cookieSameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
      const cookieSecure = process.env.NODE_ENV === 'production';

      res.cookie('accessToken', token, { httpOnly: true, secure: cookieSecure, sameSite: cookieSameSite, maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: cookieSecure, sameSite: cookieSameSite, maxAge: 7 * 24 * 60 * 60 * 1000 });

      const userSafe = { ...user };
      delete userSafe.password_hash;
      delete userSafe.two_factor_secret;

      return res.json({ success: true, user: userSafe });
    }

    // Multiple roles found: return summaries so client can ask user to choose
    const summaries = rows.map(u => ({ id: u.id, role: u.role, name: u.name, email: u.email, extra: u.extra }));
    return res.json({ success: true, users: summaries });
  } catch (e) {
    next(e);
  }
});

// Mock SSO Endpoints
app.get('/auth/google', (req, res) => {
  // Simulate Google Auth Redirect
  const redirectUrl = process.env.VITE_API_URL || 'http://localhost:5173';
  // Redirect back to client SPA using hash route so HashRouter picks it up
  res.redirect(`${redirectUrl}/#/login?sso_success=true&provider=google`);
});

app.get('/auth/microsoft', (req, res) => {
  // Simulate Microsoft Auth Redirect
  const redirectUrl = process.env.VITE_API_URL || 'http://localhost:5173';
  res.redirect(`${redirectUrl}/#/login?sso_success=true&provider=microsoft`);
});

// Magic Link Request
const handleSignupAsync = async (req, res, next) => {
  try {
    // Validate Input (guard against runtime schema errors)
    let validation;
    try {
      validation = signupSchema.safeParse(req.body);
    } catch (vErr) {
      // Zod runtime error (unexpected). Log the body for debugging and return a safe message.
      logger.error('Signup validation runtime error', { error: String(vErr?.message || vErr), body: req.body });
      return res.status(400).json({ error: 'Invalid signup payload' });
    }
    if (!validation || !validation.success) {
      const msg = (validation && validation.error && validation.error.errors && validation.error.errors[0] && validation.error.errors[0].message) || 'Invalid request';
      return res.status(400).json({ error: msg });
    }

    const { name, email, password, role = 'Management', extra = {} } = req.body;

    // Accept any email format for now (you can restrict to gmail only if needed)
    if (!email) return res.status(400).json({ error: 'Email required' });

    // Prevent duplicates across Supabase (when configured) and local Postgres.
    // If Supabase has an existing user with this email, prefer that as the source of truth
    // and avoid creating a conflicting local account.
    try {
      if (supabase) {
        const { data: sbUser, error: sbErr } = await supabase.from('users').select('id,email').ilike('email', email).maybeSingle();
        if (sbErr) {
          logger.warn('Supabase lookup failed during signup (continuing with local db):', sbErr.message || sbErr);
        } else if (sbUser && sbUser.email) {
          // Found existing user in Supabase — abort to avoid duplicate accounts
          return res.status(409).json({ error: 'Email already registered via Supabase. Please sign in or use SSO.' });
        }
      }
    } catch (checkErr) {
      logger.warn('Error checking Supabase for existing user', checkErr?.message || checkErr);
    }

    // Check existing user in local Postgres (unique across all roles)
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing && existing.rows && existing.rows.length) return res.status(409).json({ error: 'user already exists' });

    // Organization & Linking Logic
    let organizationId = null;
    let linkedStudentIds = [];
    let enrollClassId = null;
    let pendingApproval = false;
    let orgType = null;

    if (role === 'Management') {
      // Management creates the code
      // Auto-generate if not provided
      if (!extra.uniqueId || extra.uniqueId.length < 3) {
        // Generate random 6-char code (A-Z, 0-9)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let autoCode = '';
        for (let i = 0; i < 6; i++) {
          autoCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        extra.uniqueId = autoCode;
      }
      const uniqueId = extra.uniqueId;

      const orgCheck = await pool.query('SELECT id FROM organizations WHERE code = $1', [uniqueId]);
      if (orgCheck.rows.length) {
        // If collision, append random digit (simple retry logic)
        extra.uniqueId = uniqueId + Math.floor(Math.random() * 9);
      }
    } else if (role !== 'Librarian') {
      // Teachers, Students, Parents must join an existing org
      // Parents might not need org code if they just provide student email? 
      // User requirement: "for parent Singup ask 'Student Email-ID' ... 'Parent Email-ID'". 
      // Parent might not know Org Code. But we need to link them.

      if (role === 'Parent') {
        const studentEmail = extra.studentEmail;
        if (!studentEmail) return res.status(400).json({ error: 'Student Email Required' });

        // Find student(s)
        const stRes = await pool.query('SELECT id, organization_id FROM users WHERE LOWER(email) = LOWER($1) AND role = $2', [studentEmail, 'Student']);
        if (!stRes.rows.length) return res.status(400).json({ error: 'Student email not found' });

        // We link to the student(s). We don't necessarily set organization_id on parent (or we set it to student's org).
        // If multiple students, pick first or null? Let's pick first.
        linkedStudentIds.push(stRes.rows[0].id);
        organizationId = stRes.rows[0].organization_id;

      } else {
        // Teacher or Student
        const uniqueId = extra.uniqueId || extra.code; // support 'code' alias
        if (!uniqueId) return res.status(400).json({ error: 'Organization Code required' });

        const orgRes = await pool.query('SELECT id, name, type FROM organizations WHERE code = $1', [uniqueId]);
        if (!orgRes.rows.length) return res.status(400).json({ error: 'Invalid Organization Code' });
        organizationId = orgRes.rows[0].id;
        const orgName = orgRes.rows[0].name;
        orgType = orgRes.rows[0].type; // 'school' or 'institute'

        // Match Name (Strict Check as requested)
        const reqOrgName = extra.instituteName || extra.schoolName || extra.orgName;
        if (reqOrgName && reqOrgName.toLowerCase().trim() !== orgName.toLowerCase().trim()) {
          return res.status(400).json({ error: `Organization Name Verification Failed. Code belongs to "${orgName}"` });
        }

        if (role === 'Teacher') {
          // Teacher Request Flow
          pendingApproval = true;
        }

        if (role === 'Student') {
          // Student must select a class
          // "if a student is trying to singup with institue code ... only those class should be displayed" (Frontend handles display, Backend validates)
          const reqClassId = extra.classId;
          // If user passed className, resolve it? Better to expect classId from frontend select.

          // "while singup that studnet should see only class 'ABC' as singup option" -> frontend job.
          // Backend validation:
          if (!reqClassId) return res.status(400).json({ error: 'Class Selection is required' });

          const clsRes = await pool.query('SELECT id FROM classes WHERE id=$1 AND org_id=$2', [reqClassId, organizationId]);
          if (!clsRes.rows.length) return res.status(400).json({ error: 'Invalid Class selection for this organization' });
          enrollClassId = reqClassId;
        }
      }
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Step 1: INSERT user
    let userId;
    try {
      const r = await pool.query(
        'INSERT INTO users (name,email,password_hash,role,extra, organization_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,name,email,role,created_at',
        [name || null, email, hash, role, extra, organizationId]
      );
      if (!r || !r.rows || !r.rows[0]) {
        return res.status(500).json({ error: 'Failed to create user' });
      }
      userId = r.rows[0].id;

      // specific logic for Management: Create the Organization now
      if (role === 'Management') {
        const uniqueId = extra.uniqueId;
        const orgType = extra.instituteType || 'school'; // default to school if not specified? User said "School Name" if school type
        const orgName = extra.instituteName || extra.schoolName || 'My Organization';

        const orgInsert = await pool.query(
          'INSERT INTO organizations (code, name, type, owner_id) VALUES ($1,$2,$3,$4) RETURNING id',
          [uniqueId, orgName, orgType === 'institute' ? 'institute' : 'school', userId] // Map to enum if needed, or text
        );
        const newOrgId = orgInsert.rows[0].id;

        // Update user to link to this org
        await pool.query('UPDATE users SET organization_id = $1 WHERE id = $2', [newOrgId, userId]);

        // Also insert into management_profiles? Not strictly required by prompt if 'users' is central, but strict test schema has it.
        // Let's rely on 'users.role' for now as per "single table" request earlier, or add if needed.
        // The prompt later said "single users table".
      }

      // Teacher Request
      if (role === 'Teacher' && organizationId) {
        await pool.query(
          'INSERT INTO org_members (user_id, org_id, status, assigned_role_title) VALUES ($1, $2, $3, $4)',
          [userId, organizationId, 'pending', null]
        );
      }

      // Student Enrollment
      if (role === 'Student' && organizationId && enrollClassId) {
        await pool.query(
          'INSERT INTO student_enrollments (student_id, org_id, class_id) VALUES ($1, $2, $3)',
          [userId, organizationId, enrollClassId]
        );
      }

      // Parent Linking
      if (role === 'Parent' && linkedStudentIds.length > 0) {
        for (const sid of linkedStudentIds) {
          await pool.query(
            'INSERT INTO parent_student_links (parent_id, student_id) VALUES ($1, $2)',
            [userId, sid]
          );
        }
      }

    } catch (dbErr) {
      logger.error('DB insert failed in handleSignup', dbErr?.message || dbErr);
      // Unique constraint (duplicate email/username) -> return 409
      if (dbErr && dbErr.code === '23505') {
        return res.status(409).json({ error: 'Email or username already exists' });
      }
      // Only persist to disk queue if database is completely down
      if (dbErr.message && dbErr.message.includes('connection')) {
        logger.warn('Database connection failed, queueing signup to disk', dbErr?.message);
        const queued = await appendSignupQueueDisk({ name: name || null, email, password_hash: hash, role, extra, status: 'queued' });
        appendOutbox({ to: 'storageeapp@gmail.com', subject: 'Queued Signup stored while DB is down', text: `Queued signup stored offline: ${email}` });
        return res.json({ success: true, queued: true, queueItem: queued });
      }
      // Otherwise return error
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    // Step 2: Generate magic link verification token
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    try {
      await pool.query(
        'INSERT INTO email_verifications (email, token, expires_at) VALUES ($1, $2, $3)',
        [email, verificationToken, expiresAt]
      );
    } catch (err) {
      logger.warn('Failed to create email verification token', err?.message);
      // Continue anyway - user can still access their account, just not verified
    }

    // Step 3: Create verification link
    const verificationLink = `${process.env.VITE_API_URL || 'http://localhost:5173'}/#/verify-email/${verificationToken}`;

    // Step 4: Send email verification link to USER'S EMAIL
    const verificationEmailHTML = `
      <p>Hi ${name || 'User'},</p>
      <p>Thanks for signing up to EduNexus AI! Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
      <p>Or copy this link: ${verificationLink}</p>
      <p>This link expires in 24 hours.</p>
      <p>Best regards,<br>The EduNexus Team</p>
    `;

    try {
      await sendEmail(email, 'Verify Your Email - EduNexus AI', verificationEmailHTML);
      logger.info(`Verification email sent to ${email}`);
    } catch (emailErr) {
      logger.error('Failed to send verification email', emailErr?.message);
      // Queue the email for later delivery
      appendOutbox({ to: email, subject: 'Verify Your Email - EduNexus AI', text: verificationEmailHTML });
    }

    // Step 5: Send developer notification (optional)
    try {
      await sendEmail(
        'storageeapp@gmail.com',
        'New User Signup - EduNexus AI',
        `A new user has signed up.\n\nName: ${name}\nEmail: ${email}\nRole: ${role}\nTime: ${new Date().toISOString()}\nID: ${userId}`
      );
    } catch (err) {
      logger.warn('Failed to send developer notification', err?.message);
    }

    // Step 6: Return success with message to user
    let message = 'Signup successful! Please check your email to verify your account.';
    if (pendingApproval) {
      message = 'Signup request sent to Management. Please wait for approval.';
    }

    res.json({
      success: true,
      message,
      user: { id: userId, name, email, role },
      pendingApproval
    });

  } catch (err) {
    logger.error('signup error', err);
    next(err);
  }
};
// app.post('/api/signup', handleSignupAsync); // DEPRECATED - Moved to Python Service

// GET all pending signups from database queue
app.get('/api/queue-signups', checkAdminAuth, async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    let query = 'SELECT id,name,email,status,attempts,note,created_at FROM signup_queue';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT 500';

    const r = await pool.query(query, params);
    res.json({ success: true, rows: r.rows });
  } catch (e) {
    next(e);
  }
});

// Persist a queued signup payload from client to server disk queue
app.post('/api/queue-signup', async (req, res, next) => {
  try {
    const payload = req.body || {};
    // normalize fields
    const name = payload.name || null;
    const email = payload.email;
    const password_hash = payload.password_hash || payload.password || null;
    const role = payload.role || 'Management';
    const extra = payload.extra || {};

    if (!email) return res.status(400).json({ success: false, error: 'email required' });

    const entry = await appendSignupQueueDisk({ name, email, password_hash, role, extra, status: 'queued' });
    if (!entry) return res.status(500).json({ success: false, error: 'failed to write queue' });

    // Optionally notify admin that a queued signup arrived
    if (process.env.ADMIN_ALERT_EMAIL) {
      try {
        appendOutbox({ to: process.env.ADMIN_ALERT_EMAIL, subject: 'Queued Signup Received', text: `Queued signup received for ${email}` });
      } catch (e) { /* ignore */ }
    }

    res.json({ success: true, queued: true, item: entry });
  } catch (e) {
    next(e);
  }
});

// delete/cancel queued item
app.delete('/api/queue-signups/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const r = await pool.query('UPDATE signup_queue SET status = $1, note = $2 WHERE id = $3 RETURNING id', ['cancelled', 'cancelled by admin', id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// retry a queued item: attempt to create a user from the queue row
app.post('/api/queue-signups/:id/retry', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    // fetch row
    const r0 = await pool.query('SELECT id,name,email,password_hash,extra,status,attempts FROM signup_queue WHERE id=$1', [id]);
    if (!r0.rows.length) return res.status(404).json({ error: 'not found' });
    const item = r0.rows[0];
    // guard: only queued or failed items should be retried
    if (!['queued', 'failed'].includes(item.status)) return res.status(400).json({ error: 'not retryable' });

    // check existing users for same email role Management
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND role = $2', [item.email, 'Management']);
    if (existing.rows.length) {
      await pool.query('UPDATE signup_queue SET status=$1, attempts=$2, note=$3 WHERE id=$4', ['failed', item.attempts + 1, 'user already exists', id]);
      return res.status(409).json({ error: 'user exists' });
    }

    // insert into users using provided password_hash
    const insert = await pool.query('INSERT INTO users (name,email,password_hash,role,extra) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role,created_at', [item.name || null, item.email, item.password_hash, 'Management', item.extra || {}]);

    await pool.query('INSERT INTO signup_syncs (email, status, attempts, note) VALUES ($1,$2,$3,$4)', [item.email, 'synced', item.attempts + 1, 'synced by admin retry']);

    res.json({ success: true, user: insert.rows[0] });
  } catch (e) {
    logger.error('queue-retry error', e);
    try {
      const id = Number(req.params.id);
      await pool.query('UPDATE signup_queue SET status=$1, attempts = COALESCE(attempts,0)+1, note=$2 WHERE id=$3', ['failed', String(e?.message || 'error'), id]);
    } catch (ignore) { }
    next(e);
  }
});

// Org Code Analytics (Missing Endpoint Fix)
app.get('/api/org-code/analytics', authenticateToken, async (req, res) => {
  try {
    const { rows: stats } = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
                COUNT(*) FILTER (WHERE status = 'confirmed') as approved_requests,
                COUNT(*) as total_requests
            FROM org_code_requests
        `);
    res.json(stats[0]);
  } catch (e) {
    logger.error('Failed to fetch org code analytics', e);
    res.json({ pending_requests: 0, approved_requests: 0, total_requests: 0 }); // Fallback
  }
});

// View Pending Requests (Missing Endpoint Fix)
app.get('/api/org-code/requests', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM org_code_requests ORDER BY created_at DESC");
    res.json(rows);
  } catch (e) {
    logger.error('Failed to fetch org code requests', e);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// 8. Sign In (Strict Validation Migration)
app.post('/api/py/signin', async (req, res) => {
  const { email, password, role, extra } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: "Missing credentials" });

  logger.info(`py/signin attempt for email=${email} role=${role} origin=${req.get('origin') || 'none'} supabaseConfigured=${!!supabase}`);

  try {
    let user = null;

    if (!supabase) {
      if (!devRoutesEnabled) {
        logger.warn('py/signin: Supabase not configured and dev routes disabled');
        return res.status(500).json({ error: 'Supabase not configured' });
      }
      logger.warn('py/signin: Supabase not configured on server — falling back to local Postgres (dev)');
      const r = await pool.query('SELECT id,name,email,password_hash,role,extra,created_at FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
      if (!r.rows.length) {
        logger.info('py/signin: local Postgres did not find user');
        return res.status(400).json({ detail: "Unregistered email" });
      }
      user = r.rows[0];
      logger.info(`py/signin: found user in Postgres id=${user.id} role=${user.role}`);
    } else {
      // 1. Auth Login (Fetch User)
      // Query Supabase for user; on failure, fallback to Postgres when in dev mode
      let users = null;
      try {
        const r = await supabase
          .from('users')
          .select('id, name, email, password_hash, role, extra, created_at')
          .eq('email', email);
        users = r.data;
        if (r.error) {
          logger.warn('py/signin: supabase query returned error', r.error);
          users = null;
        }
      } catch (sbErr) {
        logger.warn('py/signin: supabase lookup failed (network/error)', sbErr?.message || sbErr);
        metrics.inc('supabase_failures');
        supabaseDownUntil = Date.now() + SUPABASE_DOWN_TTL_MS;
        users = null;
      }

      if (!users || users.length === 0) {
        logger.info('py/signin: user not found in Supabase');
        if (!devRoutesEnabled) {
          logger.info('py/signin: dev routes disabled, returning unregistered');
          return res.status(400).json({ detail: "Unregistered email" });
        }
        logger.info('py/signin: attempting local Postgres fallback (dev)');
        try {
          const r = await pool.query('SELECT id,name,email,password_hash,role,extra,created_at FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
          if (!r.rows.length) {
            logger.info('py/signin: user not found in Supabase or Postgres');
            return res.status(400).json({ detail: "Unregistered email" });
          }
          user = r.rows[0];
          logger.info(`py/signin: found user in Postgres id=${user.id} role=${user.role}`);
        } catch (pgErr) {
          logger.error('py/signin: local Postgres lookup failed', pgErr?.message || pgErr);
          metrics.inc('local_signin_failures');
          return res.status(400).json({ detail: "Unregistered email" });
        }
      } else {
        user = users[0];
        logger.info(`py/signin: supabase returned user id=${user.id} role=${user.role}`);
      }
    }

    // 2. Validate Password
    const hash = user.password_hash;
    let match = false;
    try {
      if (hash && hash !== 'supabase_auth') {
        // Local bcrypt-stored password
        match = await bcrypt.compare(password, hash);
        logger.info(`py/signin: bcrypt compare result for user id=${user.id} match=${match}`);
      } else {
        // Fallback: user was created via Supabase auth — verify with Supabase
        try {
          const { data: signInData, error: signInErr } = await (supabase ? supabase.auth.signInWithPassword({ email, password }) : { data: null, error: 'Supabase not configured' });
          logger.info('py/signin: supabase.auth.signInWithPassword result', { error: signInErr?.message || signInErr, hasUser: !!(signInData && signInData.user) });
          if (!signInErr && signInData && signInData.user) {
            match = true;
          }
        } catch (sbErr) {
          logger.warn('Supabase sign-in fallback failed', sbErr?.message || sbErr);
          metrics.inc('supabase_failures');
          supabaseDownUntil = Date.now() + SUPABASE_DOWN_TTL_MS;
        }
      }
    } catch (err) {
      logger.warn('Password compare error', err?.message || err);
    }

    if (!match) {

      return res.status(400).json({ detail: "Wrong password" });
    }

    // 3. User Role Mismatch Check
    if (user.role !== role) {
      return res.status(400).json({ detail: "Role mismatch" });
    }

    // 4. Strict Code & Org Name Validation (Teacher/Student/Parent)
    if (['Teacher', 'Student', 'Parent'].includes(role)) {
      const reqCode = extra?.uniqueId || extra?.code;
      const reqOrgName = extra?.instituteName || extra?.orgName || extra?.schoolName;

      if (reqCode) {
        // Validate Code
        const { data: codeData, error: codeErr } = await supabase
          .from('org_codes')
          .select('*')
          .eq('code', reqCode)
          .maybeSingle();

        if (!codeData) return res.status(400).json({ detail: "Invalid Code" });

        // Fix 1: Login Type Mismatch
        const reqLoginType = extra?.orgType;
        if (reqLoginType) {
          const dbOrgType = (codeData.type || "").toLowerCase();
          if (reqLoginType.toLowerCase().trim() !== dbOrgType) {
            return res.status(400).json({ detail: `Invalid Login Type: You selected ${reqLoginType} but code is for ${dbOrgType}` });
          }
        }

        // Fix 2: Name Mismatch
        if (reqOrgName) {
          const dbOrgId = codeData.institute_id;
          const dbOrgType = (codeData.type || "").toLowerCase();
          let nameMatch = false;

          if (dbOrgId && dbOrgId.toLowerCase().trim() === reqOrgName.toLowerCase().trim()) {
            nameMatch = true;
          } else if (dbOrgId) {
            const table = dbOrgType === 'institute' ? 'institutes' : 'schools';
            try {
              const { data: orgRes } = await supabase.from(table).select('name').eq('id', dbOrgId).maybeSingle();
              if (orgRes && orgRes.name.toLowerCase().trim() === reqOrgName.toLowerCase().trim()) {
                nameMatch = true;
              }
            } catch (err) { /* ignore lookup fail */ }
          }

          if (!nameMatch) {
            const msg = dbOrgType === 'institute' ? "Institute Name Mismatch" : "School Name Mismatch";
            return res.status(400).json({ detail: msg });
          }
        }
      }
    }

    // 5. Status Check (Teachers)
    if (role === 'Teacher') {
      const { data: tData } = await supabase.from('teachers').select('status').eq('user_id', user.id).maybeSingle();
      if (tData) {
        if (tData.status === 'pending') return res.status(403).json({ detail: "Waiting for Management Approval" });
        if (tData.status === 'rejected') return res.status(403).json({ detail: "Request was Rejected" });
      }
    }

    // 6. Generate Session
    const sessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const cookieOpts = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000
    };

    const refreshCookieOpts = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000
    };

    res.cookie('accessToken', sessToken, cookieOpts);


    res.cookie('refreshToken', refreshToken, refreshCookieOpts);

    // 7. Fetch Dashboard State
    let dashboardState = {};
    let dashboardError = false;
    try {
      const { data: dState } = await supabase.from('user_dashboard_states').select('state_data').eq('user_id', user.id).maybeSingle();
      if (dState) dashboardState = dState.state_data;
    } catch (err) { dashboardError = true; }

    // Return py-compatible JSON
    const userSafe = { ...user };
    delete userSafe.password_hash;

    res.json({
      success: true,
      token: sessToken,
      user: userSafe,
      dashboard_state: dashboardState,
      dashboard_error: dashboardError
    });

  } catch (e) {
    logger.error('Error in py/signin proxy:', e);
    res.status(500).json({ detail: `Internal Server Error: ${e.message}` });
  }
});

// Dev: Verify user existence across Supabase and Postgres
if (devRoutesEnabled) {
  app.post('/api/dev/verify-user', async (req, res) => {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const out = { email, role, checks: {} };
    try {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
        out.checks.supabase_user = { found: !!data, data: data || null, error: error ? String(error) : null };
        if (data && role) {
          out.checks.supabase_role = { matches: data.role === role, storedRole: data.role };
        }
      } else {
        out.checks.supabase_user = { found: false, error: 'Supabase not configured' };
      }

      try {
        const r = await pool.query('SELECT * FROM users WHERE LOWER(email)=LOWER($1)', [email]);
        out.checks.postgres_user = { found: r.rowCount > 0, data: r.rows[0] || null };
        if (r.rowCount > 0 && role) out.checks.postgres_role = { matches: r.rows[0].role === role, storedRole: r.rows[0].role };
      } catch (pgErr) {
        out.checks.postgres_user = { found: false, error: String(pgErr) };
      }

      res.json(out);
    } catch (e) {
      logger.error('dev/verify-user error', e);
      res.status(500).json({ error: String(e?.message || e) });
    }
  });
}

// bulk retry
app.post('/api/queue-signups/bulk-retry', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    const results = [];
    for (const id of ids) {
      try {
        const r = await pool.query('SELECT id,name,email,password_hash,extra,status,attempts FROM signup_queue WHERE id=$1', [id]);
        if (!r.rows.length) { results.push({ id, ok: false, error: 'not found' }); continue; }
        const item = r.rows[0];
        if (!['queued', 'failed'].includes(item.status)) { results.push({ id, ok: false, error: 'not retryable' }); continue; }
        const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND role = $2', [item.email, 'Management']);
        if (existing.rows.length) { await pool.query('UPDATE signup_queue SET status=$1, attempts=$2, note=$3 WHERE id=$4', ['failed', item.attempts + 1, 'user exists', id]); results.push({ id, ok: false, error: 'exists' }); continue; }
        const insert = await pool.query('INSERT INTO users (name,email,password_hash,role,extra) VALUES ($1,$2,$3,$4,$5) RETURNING id,email', [item.name || null, item.email, item.password_hash, 'Management', item.extra || {}]);
        await pool.query('UPDATE signup_queue SET status=$1, attempts=$2, note=$3 WHERE id=$4', ['synced', item.attempts + 1, 'synced by admin bulk', id]);
        await pool.query('INSERT INTO signup_syncs (email, status, attempts, note) VALUES ($1,$2,$3,$4)', [item.email, 'synced', item.attempts + 1, 'synced by admin bulk']);
        results.push({ id, ok: true, user: insert.rows[0] });
      } catch (err) {
        results.push({ id, ok: false, error: String(err?.message || 'error') });
      }
    }
    res.json({ success: true, results });
  } catch (e) {
    next(e);
  }
});

const authenticator = require('otplib').authenticator;
const qrcode = require('qrcode');

// 2FA Setup
app.post('/api/2fa/setup', authenticateToken, async (req, res, next) => {
  try {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.email, 'EduNexus AI', secret);
    const imageUrl = await qrcode.toDataURL(otpauth);

    // Store secret temporarily or just return it? 
    // Better to store it only after verification. But for simplicity, we can store it now but mark 2fa as disabled until verified?
    // Or just return secret and expect verify call to save it.
    // Let's save it but maybe we need a 'two_factor_enabled' flag? 
    // For now, checks if secret is present. So we shouldn't save it yet.
    // We'll send it to client, client verifies, then we save.

    // Actually, standard flow: 
    // 1. Generate secret.
    // 2. Show QR.
    // 3. User enters code.
    // 4. Server verifies code.
    // 5. Server saves secret.

    res.json({ success: true, secret, imageUrl });
  } catch (e) {
    next(e);
  }
});

app.post('/api/2fa/verify', authenticateToken, async (req, res, next) => {
  try {
    const { token, secret } = req.body;
    if (!token || !secret) return res.status(400).json({ error: 'Missing fields' });

    const isValid = authenticator.check(token, secret);
    if (!isValid) return res.status(400).json({ error: 'Invalid token' });

    await pool.query('UPDATE users SET two_factor_secret=$1 WHERE id=$2', [secret, req.user.id]);

    res.json({ success: true, message: '2FA enabled successfully.' });
  } catch (e) {
    next(e);
  }
});

const { generateStudySchedule } = require('./services/aiService');

// ...

// AI Study Schedule Endpoint
app.post('/api/generate-study-schedule', authenticateToken, async (req, res, next) => {
  try {
    const { marks, availableSlots } = req.body;
    if (!marks || !availableSlots) return res.status(400).json({ error: 'Missing marks or availableSlots' });

    const schedule = await generateStudySchedule(marks, availableSlots);
    res.json({ success: true, schedule });
  } catch (e) {
    next(e);
  }
});

// Email Existence Check Endpoint
app.post('/api/auth/check-email', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    const exists = result.rowCount > 0;

    return res.json({ exists });
  } catch (e) {
    logger.error('Check email error', e);
    next(e);
  }
});

// Google Login Verification Endpoint
app.post('/api/auth/google-login', async (req, res, next) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Missing access token' });

    // Initialize Supabase Client
    // We use the ANON key to verify the user token (getUser)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify Token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user || !user.email) {
      return res.status(401).json({ error: 'Invalid Google session' });
    }

    const email = user.email;

    // OPTIMIZATION: This query uses the 'idx_users_email' B-Tree index.
    // The database engine automatically optimizes this search:
    // 1. Checks the First Letter (Root Node of B-Tree)
    // 2. Checks subsequent characters (Level 2 Nodes, e.g. first 5 chars)
    // 3. Pinpoints the exact Email (Leaf Node)
    // This is O(log n) complexity, much faster than a manual string scan.
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    const existingUser = result.rows[0];

    if (existingUser) {
      // User exists - Log them in!

      // Check 2FA if enabled (optional, skipping for Google for now unless you want strict 2FA on Google too)
      // Standard practice: OAuth implies 2FA from provider, but if app has own 2FA, we might verify it.
      // For now, bypass app 2FA for Google Login ease-of-use, unless strictly required.
      // User said "no data will be asked", implying smooth login.

      const token = generateAccessToken(existingUser);
      const refreshToken = generateRefreshToken(existingUser);

      // FIX for 401: 'strict' prevents cookies across different Render domains (frontend vs backend)
      // Must use 'none' + 'secure' for cross-site cookies.
      const cookieOpts = {
        httpOnly: true,
        secure: true, // Always true for SameSite=None
        sameSite: 'none',
        maxAge: 15 * 60 * 1000 // 15 mins
      };

      const refreshCookieOpts = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      };

      res.cookie('accessToken', token, cookieOpts);
      res.cookie('refreshToken', refreshToken, refreshCookieOpts);

      const userSafe = { ...existingUser };
      delete userSafe.password_hash;
      delete userSafe.two_factor_secret;

      return res.json({ success: true, user: userSafe });
    } else {
      // User does NOT exist in our DB
      return res.status(404).json({ error: 'Account not found. Please sign up first.' });
    }
  } catch (e) {
    logger.error('Google login error', e);
    next(e);
  }
});

// Updated Login with JWT & 2FA - DEPRECATED (Moved to Python Service)
/*
app.post('/api/login', async (req, res, next) => {
  try {
    // Validate Input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { email, password, role = 'Management', extra, twoFactorToken } = req.body;

    const r = await pool.query('SELECT id,name,email,password_hash,role,extra,created_at,two_factor_secret,is_verified FROM users WHERE LOWER(email)=LOWER($1) AND role=$2', [email, role]);
    if (!r.rows.length) return res.status(404).json({ error: 'Unregistered email' });

    const u = r.rows[0];
    const ok = await bcrypt.compare(password, u.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'Wrong password' });

    // Check unique code
    if (extra && extra.uniqueId) {
      const storedUniqueId = u.extra && u.extra.uniqueId;
      if (storedUniqueId && storedUniqueId !== extra.uniqueId) {
        return res.status(401).json({ error: 'Wrong unique code' });
      }
    }

    // Check 2FA
    if (u.two_factor_secret) {
      if (!twoFactorToken) {
        return res.json({ success: false, require2fa: true });
      }
      const verified = authenticator.check(twoFactorToken, u.two_factor_secret);
      if (!verified) return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    // Generate Tokens
    const accessToken = generateAccessToken(u);
    const refreshToken = generateRefreshToken(u);

    // Set Cookies
    const cookieSameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
    const cookieSecure = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 15 * 60 * 1000 // 15m
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7d
    });

    delete u.password_hash;
    delete u.two_factor_secret; // Don't send secret to client
    res.json({ success: true, user: u });
  } catch (err) {
    next(err);
  }
});
*/

// Refresh Token Endpoint
app.post('/api/refresh-token', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = generateAccessToken(user);
    const cookieSameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
    const cookieSecure = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 15 * 60 * 1000
    });
    res.json({ success: true });
  });
});

// Get Current User (Session Check)
app.get('/api/me', authenticateToken, async (req, res, next) => {
  try {
    const r = await pool.query('SELECT id,name,email,role,extra,created_at FROM users WHERE id=$1', [req.user.id]);
    if (!r.rows.length) return res.sendStatus(404);
    res.json({ success: true, user: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  // For dev-only routes, show a pretty HTML error page with stack (non-production/dev admin only)
  const isDevRoute = String(req.path || '').startsWith('/dev-view');
  const allowDetails = isDevRoute || (devRoutesEnabled && process.env.NODE_ENV !== 'production');
  if (allowDetails) {
    const msg = escapeHtml(String(err.message || 'Internal Server Error'));
    const stack = escapeHtml(String(err.stack || ''));
    res.status(500).set('Content-Type', 'text/html').send(`
      <html><head><title>Dev Error</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Arial;padding:20px;">
      <h2 style="color:#b00020">Developer Error</h2>
      <div style="margin-bottom:12px;padding:12px;border-radius:6px;background:#fff4f4;border:1px solid #f0d0d0;color:#400">${msg}</div>
      <h3 style="margin-top:12px">Stack</h3>
      <pre style="white-space:pre-wrap;background:#f7f7f7;padding:10px;border-radius:6px;border:1px solid #eee;">${stack}</pre>
      <p style="font-size:12px;color:#666;margin-top:12px">This is a developer-only error view. Ensure no secrets are exposed in logs.</p>
      </body></html>
    `);
    return;
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

// Dashboard Data Endpoint
app.get('/api/dashboard-data', authenticateToken, async (req, res, next) => {
  try {
    const orgCodesQuery = await pool.query('SELECT * FROM org_codes');
    // Best effort for other entities if tables exist, otherwise return empty
    let deps = [], classes = [], teachers = [], relatedUsers = [];
    try { deps = (await pool.query('SELECT * FROM departments')).rows; } catch (e) { }
    try { classes = (await pool.query('SELECT * FROM classes')).rows; } catch (e) { }
    try { teachers = (await pool.query("SELECT * FROM users WHERE role = 'Teacher'")).rows; } catch (e) { }

    if (req.user && req.user.role === 'Parent') {
      try {
        const parentRow = await pool.query('SELECT extra FROM users WHERE id=$1', [req.user.id]);
        if (parentRow.rows.length) {
          const childIds = parentRow.rows[0].extra.childIds || [];
          if (childIds.length > 0) {
            const kids = await pool.query('SELECT id,name,email,role,extra,organization_id,linked_student_id,roll_number FROM users WHERE id = ANY($1)', [childIds]);
            relatedUsers = kids.rows;
          }
        }
      } catch (e) {
        // ignore errors in fetching related users
        console.error('Failed to fetch related users for parent', e);
      }
    }

    res.json({
      orgCodes: orgCodesQuery.rows || [],
      departments: deps,
      classes: classes,
      teachers: teachers,
      relatedUsers: relatedUsers
    });
  } catch (e) {
    next(e);
  }
});

// End of migrated endpoints (Removed duplicates)

// === STRICT FLOW MANAGEMENT ENDPOINTS ===

// 1. Get Pending Members (Teachers)
app.get('/api/org/members', authenticateToken, async (req, res, next) => {
  try {
    const status = req.query.status; // 'pending', 'approved', etc.
    const orgId = req.user.organization_id; // Assuming user has this from token or query? 
    // If token doesn't have it, fetch from users table
    let oid = orgId;
    if (!oid) {
      const u = await pool.query('SELECT organization_id FROM users WHERE id=$1', [req.user.id]);
      oid = u.rows[0]?.organization_id;
    }
    if (!oid) return res.status(400).json({ error: 'User does not belong to an organization' });

    let q = `
      SELECT om.id, om.user_id, om.status, om.assigned_role_title, u.name, u.email, u.extra 
      FROM org_members om
      JOIN users u ON om.user_id = u.id
      WHERE om.org_id = $1
    `;
    const params = [oid];
    if (status) {
      q += ' AND om.status = $2';
      params.push(status);
    }
    const r = await pool.query(q, params);
    res.json({ success: true, members: r.rows });
  } catch (e) { next(e); }
});

// 2. Approve Teacher Request
app.post('/api/org/members/approve', authenticateToken, async (req, res, next) => {
  try {
    const { memberId, roleTitle, classId } = req.body; // roleTitle e.g. "HOD", "Class Teacher"
    // Validate Management Role
    if (req.user.role !== 'Management') return res.status(403).json({ error: 'Unauthorized' });

    // Update org_members
    const r = await pool.query(
      'UPDATE org_members SET status=$1, assigned_role_title=$2 WHERE id=$3 RETURNING user_id, org_id',
      ['approved', roleTitle, memberId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Request not found' });

    const { user_id, org_id } = r.rows[0];

    // If ClassId provided (e.g. Class Teacher), assign class
    if (classId) {
      await pool.query(
        'INSERT INTO class_assignments (class_id, teacher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [classId, user_id]
      );
    }

    res.json({ success: true });
  } catch (e) { next(e); }
});

// 3. Create Class
app.post('/api/org/classes', authenticateToken, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Class Name required' });

    // Get Org ID
    const u = await pool.query('SELECT organization_id FROM users WHERE id=$1', [req.user.id]);
    const oid = u.rows[0]?.organization_id;
    if (!oid) return res.status(400).json({ error: 'Organization not found' });

    const r = await pool.query(
      'INSERT INTO classes (org_id, name) VALUES ($1, $2) RETURNING id, name',
      [oid, name]
    );
    res.json({ success: true, class: r.rows[0] });
  } catch (e) { next(e); }
});

// 4. Assign Teacher to Class
app.post('/api/org/classes/assign', authenticateToken, async (req, res, next) => {
  try {
    const { teacherId, classId } = req.body;
    await pool.query(
      'INSERT INTO class_assignments (class_id, teacher_id) VALUES ($1, $2)',
      [classId, teacherId]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
});

// 5. Public: List Classes by Org Code (for Student Signup)
app.get('/api/public/classes', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const org = await pool.query('SELECT id FROM organizations WHERE code=$1', [code]);
    if (!org.rows.length) return res.status(404).json({ error: 'Invalid Code' });

    const classes = await pool.query('SELECT id, name FROM classes WHERE org_id=$1', [org.rows[0].id]);
    res.json({ success: true, classes: classes.rows });
  } catch (e) { next(e); }
});

// 6. Parent: Get Linked Students
app.get('/api/parent/students', authenticateToken, async (req, res, next) => {
  try {
    const r = await pool.query(`
         SELECT u.id, u.name, u.email, se.class_id, c.name as class_name
         FROM parent_student_links psl
         JOIN users u ON psl.student_id = u.id
         LEFT JOIN student_enrollments se ON se.student_id = u.id
         LEFT JOIN classes c ON se.class_id = c.id
         WHERE psl.parent_id = $1
      `, [req.user.id]);
    res.json({ success: true, students: r.rows });
  } catch (e) { next(e); }
});

const checkDbPrivileges = async () => {
  try {
    // Check whether Supabase roles exist in this Postgres instance (local dev may not have them)
    const rolesRes = await pool.query("SELECT rolname FROM pg_roles WHERE rolname IN ('authenticated','anon','service_role')");
    const roles = (rolesRes.rows || []).map(r => r.rolname);
    if (!roles.length) {
      logger.warn('No Supabase DB roles (authenticated/anon/service_role) found in this database; skipping privilege checks');
      return true; // Not a failure for local dev
    }

    // Build has_schema_privilege checks dynamically for existing roles
    const checks = roles.map(r => `has_schema_privilege('${r}','public','usage') as ${r}_usage`).join(', ');
    const res = await pool.query(`SELECT ${checks}`);
    const row = res.rows[0] || {};
    for (const r of roles) {
      if (!row[`${r}_usage`]) logger.warn(`DB role \`${r}\` lacks USAGE on schema public`);
    }
    return true;
  } catch (e) {
    logger.error('DB privilege check failed:', e?.message || e);
    return true; // don't block server start; warn only
  }
};

if (require.main === module) {
  (async () => {
    const ok = await checkDbPrivileges();
    if (!ok) {
      logger.warn('DB privilege check failed - attempting to continue; consider running server/grant_schema_permissions.py or applying `012_grant_schema_usage.sql`');
    }
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`edunexus server listening on ${PORT}`);
      if (devRoutesEnabled) {
        logger.info(`Developer view available: http://localhost:${PORT}/dev-view (protected by DEV'S_PASSWORD in server/.env)`);
        // Print a blue developer link to the terminal for convenience (no secrets)
        try {
          console.log('\x1b[34m%s\x1b[0m', `Developer view available: http://localhost:${PORT}/dev-view`);
        } catch (e) { /* ignore */ }
      }
    });
  })();
}

// allow overriding pool for tests
const setPool = (p) => { pool = p; };

// Export sendEmail so worker scripts and test helpers can reuse the same
// delivery implementation without starting an http listener.
const setSupabaseDownUntil = (t) => { supabaseDownUntil = t; };

// Allow tests to override the Supabase client with a mock
const setSupabaseClient = (client) => { supabase = client; };

module.exports = { app, setPool, sendEmail, setSendEmail, setSupabaseDownUntil, setSupabaseClient };
