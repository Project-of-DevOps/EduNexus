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

require('dotenv').config();
console.log('Server starting... Environment loaded.');
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
  // Also print to stdout/stderr so hosting logs (Render, Heroku, etc.) show the reason
  console.error(msg);
  if (process.env.NODE_ENV === 'test') {
    logger.warn(msg);
  } else {
    logger.error(msg);
    process.exit(1);
  }
}

const app = express();

// Security Headers
app.use(helmet());

// CORS Configuration
// Dynamic CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Dynamic allow list
    const allowedPatterns = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/, // 172.x.x.x
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/   // 10.x.x.x (User's current network)
    ];

    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin)) ||
      origin === process.env.VITE_API_URL ||
      origin === 'http://localhost:5173';

    if (isAllowed) {
      return callback(null, true);
    } else {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
  },
  credentials: true
}));

app.use(cookieParser());

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

const managementRoutes = require('./routes/management');
app.use('/api/management', managementRoutes);

app.use(express.json());

const PORT = process.env.PORT || 4000;

// Request Logging Middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
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
app.get('/api/org-code/confirm/:token', async (req, res, next) => {
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

    // Insert into org_codes table (Created by setup_tables.js)
    try {
      await pool.query(
        'INSERT INTO org_codes (code, type, institute_id, created_by) VALUES ($1, $2, $3, $4)',
        [code, org_type, institute_id, null] // created_by is null as it is system generated
      );
    } catch (dbErr) {
      console.error('Failed to insert org_code', dbErr);
      // Fallback: If table missing (shouldn't be), just log. 
      // But we want it to work.
    }

    // Email user
    await sendEmail(
      management_email,
      'Organization Code Approved',
      `Your request for ${org_type} code has been approved.\n\nYour Code: ${code}\n\nYou can now use this code to register users.`
    );

    res.send(`Request confirmed. Code Generated: ${code}. Email sent to user.`);
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

      res.cookie('accessToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

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

    // Check existing user
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND role = $2', [email, role]);
    if (existing && existing.rows && existing.rows.length) return res.status(409).json({ error: 'user already exists' });

    // Organization & Linking Logic
    let organizationId = null;
    let linkedStudentId = null;
    const rollNumber = extra.rollNumber || null;

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
      const uniqueId = extra.uniqueId;
      if (!uniqueId) return res.status(400).json({ error: 'Organization Code required' });

      const orgRes = await pool.query('SELECT id FROM organizations WHERE code = $1', [uniqueId]);
      if (!orgRes.rows.length) return res.status(400).json({ error: 'Invalid Organization Code' });
      organizationId = orgRes.rows[0].id;

      if (role === 'Student') {
        if (!rollNumber) return res.status(400).json({ error: 'Roll Number required for Students' });
        // Check uniqueness
        const dupRes = await pool.query('SELECT id FROM users WHERE organization_id = $1 AND roll_number = $2', [organizationId, rollNumber]);
        if (dupRes.rows.length) return res.status(409).json({ error: 'Roll Number already registered in this organization' });
      }

      if (role === 'Parent') {
        if (!rollNumber) return res.status(400).json({ error: 'Student Roll Number required for Parents' });

        // Find student in THIS organization by Roll Number
        const stRes = await pool.query('SELECT id FROM users WHERE roll_number = $1 AND role = $2 AND organization_id = $3', [rollNumber, 'Student', organizationId]);
        if (!stRes.rows.length) return res.status(400).json({ error: 'Student Roll Number not found in this organization' });
        linkedStudentId = stRes.rows[0].id;
      }
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Step 1: INSERT user
    let userId;
    try {
      const r = await pool.query(
        'INSERT INTO users (name,email,password_hash,role,extra, organization_id, linked_student_id, roll_number) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,email,role,created_at',
        [name || null, email, hash, role, extra, organizationId, linkedStudentId, rollNumber]
      );
      if (!r || !r.rows || !r.rows[0]) {
        return res.status(500).json({ error: 'Failed to create user' });
      }
      userId = r.rows[0].id;

      // specific logic for Management: Create the Organization now
      if (role === 'Management') {
        const uniqueId = extra.uniqueId;
        const orgInsert = await pool.query(
          'INSERT INTO organizations (code, name, management_id) VALUES ($1,$2,$3) RETURNING id',
          [uniqueId, extra.instituteName || 'My Institute', userId]
        );
        const newOrgId = orgInsert.rows[0].id;

        // Update user to link to this org
        await pool.query('UPDATE users SET organization_id = $1 WHERE id = $2', [newOrgId, userId]);
      }

    } catch (dbErr) {
      logger.error('DB insert failed in handleSignup', dbErr?.message || dbErr);
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
    res.json({
      success: true,
      message: 'Signup successful! Please check your email to verify your account.',
      user: { id: userId, name, email, role }
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

    // mark queue item as synced
    await pool.query('UPDATE signup_queue SET status=$1, attempts=$2, note=$3 WHERE id=$4', ['synced', item.attempts + 1, 'synced by admin retry', id]);

    // add audit
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

      res.cookie('accessToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

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
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15m
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
  res.status(500).json({ error: 'Internal Server Error' });
});

// Dashboard Data Endpoint
app.get('/api/dashboard-data', authenticateToken, async (req, res, next) => {
  try {
    const orgCodesQuery = await pool.query('SELECT * FROM org_codes');
    // Best effort for other entities if tables exist, otherwise return empty
    let deps = [], classes = [], teachers = [];
    try { deps = (await pool.query('SELECT * FROM departments')).rows; } catch (e) { }
    try { classes = (await pool.query('SELECT * FROM classes')).rows; } catch (e) { }
    try { teachers = (await pool.query("SELECT * FROM users WHERE role = 'Teacher'")).rows; } catch (e) { }

    res.json({
      orgCodes: orgCodesQuery.rows || [],
      departments: deps,
      classes: classes,
      teachers: teachers
    });
  } catch (e) {
    next(e);
  }
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => logger.info(`edunexus server listening on ${PORT}`));
}

// allow overriding pool for tests
const setPool = (p) => { pool = p; };

// Export sendEmail so worker scripts and test helpers can reuse the same
// delivery implementation without starting an http listener.
module.exports = { app, setPool, sendEmail, setSendEmail };
