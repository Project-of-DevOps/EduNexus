#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const DATA_DIR = path.join(__dirname, 'data');
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json');
const QUEUE_FILE = path.join(DATA_DIR, 'signup_queue_disk.json');
const ORG_REQUESTS_FILE = path.join(DATA_DIR, 'org_code_requests_disk.json');
const INBOUND_FILE = path.join(DATA_DIR, 'inbound.json');

const readJsonFile = (file) => {
  try {
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw) return [];
    return JSON.parse(raw || '[]');
  } catch (e) {
    logger.warn('readJsonFile error', file, e?.message || e);
    return [];
  }
};

const writeJsonFile = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    logger.error('writeJsonFile error', file, e?.message || e);
  }
};

const appendOutbox = (mail) => {
  try {
    const cur = readJsonFile(OUTBOX_FILE) || [];
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
  } catch (e) {
    logger.error('appendOutbox failed', e?.message || e);
    return null;
  }
};

const appendInbound = (obj) => {
  try {
    const cur = readJsonFile(INBOUND_FILE) || [];
    const entry = { id: `in_${Date.now()}`, ...obj, receivedAt: new Date().toISOString() };
    cur.unshift(entry);
    writeJsonFile(INBOUND_FILE, cur);
    return entry;
  } catch (e) {
    logger.error('appendInbound failed', e?.message || e);
    return null;
  }
};

// The outbox worker is designed to run as a standalone process and may
// be deployed separately from the main web server. It implements its own
// sendEmail strategy (SendGrid -> SMTP -> mock/outbox) and exposes a
// setter for tests to replace the behavior deterministically.

const nodemailer = require('nodemailer');
let sendEmailImpl = async (to, subject, text) => {
  // Prefer SendGrid when configured
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sendgrid = require('@sendgrid/mail');
      sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
      await sendgrid.send({ to, from: process.env.SMTP_FROM || 'noreply@edunexus.ai', subject, text });
      return true;
    } catch (err) {
      logger.warn('SendGrid send failed in worker', err?.message || err);
      // fall through to SMTP/outbox fallback
    }
  }

  if (process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: !!process.env.SMTP_SECURE,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
      });
      await transporter.sendMail({ from: process.env.SMTP_FROM || 'noreply@edunexus.ai', to, subject, text });
      return true;
    } catch (err) {
      logger.warn('SMTP send failed in worker', err?.message || err);
      // fall through to append to disk outbox
    }
  }

  // If no delivery mechanism available, persist to outbox file for later retry
  appendOutbox({ to, subject, text });
  return false;
};

const setSendEmail = (fn) => { if (typeof fn === 'function') sendEmailImpl = fn; };

async function processOutboxOnce() {
  const outbox = readJsonFile(OUTBOX_FILE);
  if (!Array.isArray(outbox) || outbox.length === 0) return { processed: 0 };
  let processed = 0;
  for (const msg of outbox.slice()) {
    try {
      const ok = await sendEmailImpl(msg.to, msg.subject, msg.text);
      const now = new Date().toISOString();
      if (ok) {
        msg.sent = true;
        msg.deliveredAt = now;
        msg.history = msg.history || [];
        msg.history.push({ at: now, status: 'sent', provider: process.env.SENDGRID_API_KEY ? 'sendgrid' : (process.env.SMTP_HOST ? 'smtp' : 'mock') });
      } else {
        msg.attempts = (msg.attempts || 0) + 1;
        msg.lastAttemptAt = now;
        msg.history = msg.history || [];
        msg.history.push({ at: now, status: 'failed', error: 'provider-unavailable' });
      }
      processed++;
    } catch (e) {
      msg.attempts = (msg.attempts || 0) + 1;
      msg.lastAttemptAt = new Date().toISOString();
      msg.history = msg.history || [];
      msg.history.push({ at: msg.lastAttemptAt, status: 'error', error: String(e?.message || e) });
    }
  }
  const keep = outbox.filter(m => !m.sent && (m.attempts || 0) < 10);
  writeJsonFile(OUTBOX_FILE, keep);
  return { processed };
}

// optional inbox polling (IMAP) to capture inbound messages when server isn't running
let imapConfig = null;
try {
  if (process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASS) {
    imapConfig = {
      imap: {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASS,
        host: process.env.IMAP_HOST,
        port: Number(process.env.IMAP_PORT || 993),
        tls: (process.env.IMAP_TLS || 'true') === 'true',
        authTimeout: 10000
      }
    };
  }
} catch (e) {
  logger.warn('Failed to prepare IMAP config', e?.message || e);
}

async function processInboxOnce() {
  if (!imapConfig) return { processed: 0, reason: 'no-imap-config' };
  try {
    let imap = null;
    try {
      const imaps = require('imap-simple');
      const client = await imaps.connect(imapConfig);
      await client.openBox('INBOX');
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'], markSeen: true };
      const messages = await client.search(searchCriteria, fetchOptions);
      let processed = 0;
      for (const m of messages) {
        const all = m.parts || [];
        let headers = {};
        let body = '';
        for (const p of all) {
          if (p.which && p.which.indexOf('HEADER') === 0) {
            const raw = p.body;
            headers = raw;
          } else if (p.which === 'TEXT') {
            body = p.body;
          }
        }
        appendInbound({ from: headers.from && headers.from[0], subject: headers.subject && headers.subject[0], to: headers.to && headers.to[0], body });
        processed++;
      }
      await client.end();
      return { processed };
    } catch (e) {
      logger.warn('IMAP processing failed', e?.message || e);
      return { processed: 0, error: String(e?.message || e) };
    }
  } catch (e) {
    logger.warn('Failed to process inbox', e?.message || e);
    return { processed: 0, error: String(e?.message || e) };
  }
}

async function processSignupQueueOnce() {
  const queue = readJsonFile(QUEUE_FILE);
  if (!Array.isArray(queue) || queue.length === 0) return { processed: 0 };
  let processed = 0;
  try {
    const db = require('./db');
    // Avoid trying DB inserts when the DB isn't reachable; check first.
    const ok = typeof db.checkConnection === 'function' ? await db.checkConnection() : true;
    if (!ok) {
      logger.info('DB not reachable; skipping signup queue processing this run');
      return { processed: 0 };
    }
    const pool = db.pool;
    for (const item of queue.slice()) {
      try {
        await pool.query('INSERT INTO users (name,email,password_hash,role,extra) VALUES ($1,$2,$3,$4,$5)', [item.name || null, item.email, item.password_hash, item.role || 'Management', item.extra || {}]);
        processed++;
        item.processed = true;
      } catch (e) {
        item.attempts = (item.attempts || 0) + 1;
      }
    }
    const keep = queue.filter(i => !i.processed && (i.attempts || 0) < 10);
    writeJsonFile(QUEUE_FILE, keep);
  } catch (e) {
    logger.warn('DB not available to process signup queue', e?.message || e);
  }
  return { processed };
}

let db = require('./db');
const setDb = (d) => { db = d; };

// ... (existing imports)

// ...

async function processOrgRequestsOnce() {
  const list = readJsonFile(ORG_REQUESTS_FILE);
  if (!Array.isArray(list) || list.length === 0) return { processed: 0 };
  let processed = 0;
  try {
    // Check connection
    const ok = typeof db.checkConnection === 'function' ? await db.checkConnection() : true;
    if (!ok) {
      logger.info('DB not reachable; skipping org_code_requests disk processing this run');
      return { processed: 0 };
    }
    const pool = db.pool;
    const devEmail = process.env.DEV_NOTIFY_EMAIL || process.env.ADMIN_ALERT_EMAIL || 'storageeapp@gmail.com';
    for (const item of list.slice()) {
      try {
        // Check if exists
        const existing = await pool.query('SELECT id FROM org_code_requests WHERE token=$1', [item.token]);
        if (existing.rows.length) {
          // Update
          await pool.query('UPDATE org_code_requests SET status=$1, org_code=$2 WHERE token=$3',
            [item.status || 'pending', item.org_code || item.orgCode || null, item.token]);
        } else {
          // Insert
          await pool.query('INSERT INTO org_code_requests (management_email, org_type, institute_id, token, status, org_code) VALUES ($1,$2,$3,$4,$5,$6)',
            [item.managementEmail || item.management_email, item.orgType || item.org_type, item.instituteId || item.institute_id || null, item.token, item.status || 'pending', item.org_code || item.orgCode || null]);
        }

        // Notify developer if it was a recovery of a pending request (not confirmed yet)
        if ((item.status || 'pending') === 'pending') {
          const confirmLink = `${process.env.VITE_API_URL || 'http://localhost:4000'}/api/org-code/confirm/${item.token}`;
          try { await sendEmailImpl(devEmail, 'Recovered Organization Code Request', `Recovered request from: ${item.managementEmail || item.management_email} — confirm: ${confirmLink}`); } catch (e) { appendOutbox({ to: devEmail, subject: 'Recovered Organization Code Request', text: `Recovered request from: ${item.managementEmail || item.management_email} — confirm: ${confirmLink}` }); }
        }

        processed++;
        item.processed = true;
      } catch (e) {
        item.attempts = (item.attempts || 0) + 1;
        logger.warn('Failed to insert/update org_code_request from disk', e?.message || e);
      }
    }
    const keep = list.filter(i => !i.processed && (i.attempts || 0) < 10);
    writeJsonFile(ORG_REQUESTS_FILE, keep);
  } catch (e) {
    logger.warn('Error processing org requests disk', e?.message || e);
  }
  return { processed };
}

// ...

module.exports = { processOutboxOnce, processSignupQueueOnce, processInboxOnce, processOrgRequestsOnce, processInboundCommandsOnce, runOnce, runLoop, appendOutbox, appendInbound, setSendEmail, setDb };

// process inbound mailbox messages that may contain confirmation/rejection commands
async function processInboundCommandsOnce() {
  const inbound = readJsonFile(INBOUND_FILE);
  if (!Array.isArray(inbound) || inbound.length === 0) return { processed: 0 };
  let processed = 0;
  try {
    const db = require('./db');
    const pool = db.pool;
    for (const msg of inbound.slice()) {
      try {
        const body = String(msg.body || '') + '\n' + String(msg.subject || '');
        // find token via confirm/reject URL or explicit token words
        const tokenMatch = body.match(/\/api\/org-code\/confirm\/(\w{6,64})/i) || body.match(/confirm(?:ation)?[:\s]+([A-Za-z0-9_\-]{6,64})/i) || body.match(/approve[:\s]+([A-Za-z0-9_\-]{6,64})/i);
        const rejectMatch = body.match(/\/api\/org-code\/reject\/(\w{6,64})/i) || body.match(/reject[:\s]+([A-Za-z0-9_\-]{6,64})/i);
        if (tokenMatch) {
          const token = tokenMatch[1];
          // Try to confirm request in DB
          const okConn = typeof db.checkConnection === 'function' ? await db.checkConnection() : true;
          if (okConn) {
            // generate a 6-char code and update the DB
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const r = await pool.query('UPDATE org_code_requests SET status=$1, org_code=$2 WHERE token=$3 RETURNING management_email, org_type, institute_id, id', ['confirmed', code, token]);
            if (r && r.rows && r.rows.length) {
              await sendEmailImpl(r.rows[0].management_email, 'Organization Code Approved', `Your request for ${r.rows[0].org_type} has been approved. Your code is: ${code}`);
            }
          } else {
            // fallback: attempt to find request in disk queue and generate a code locally then email management
            const disk = readJsonFile(ORG_REQUESTS_FILE);
            const idx = disk.findIndex(x => x.token === token && (x.status || 'pending') === 'pending');
            if (idx >= 0) {
              const entry = disk[idx];
              const code = Math.random().toString(36).substring(2, 8).toUpperCase();
              disk.splice(idx, 1);
              writeJsonFile(ORG_REQUESTS_FILE, disk);
              appendOutbox({ to: entry.managementEmail || entry.management_email, subject: 'Organization Code Approved', text: `Your request for ${entry.orgType || entry.org_type} has been approved. Your code is: ${code}` });
            }
          }
          processed++;
        } else if (rejectMatch) {
          const token = rejectMatch[1];
          const reason = (body.match(/reason[:\s]+([^\n]+)/i) || [null, ''])?.[1] || '';
          const okConn = typeof db.checkConnection === 'function' ? await db.checkConnection() : true;
          if (okConn) {
            const r = await pool.query('UPDATE org_code_requests SET status=$1 WHERE token=$2 RETURNING management_email, org_type, institute_id', ['rejected', token]);
            if (r && r.rows && r.rows.length) {
              await sendEmailImpl(r.rows[0].management_email, 'Organization Code Request Rejected', `Your request for ${r.rows[0].org_type}${r.rows[0].institute_id ? ' (' + r.rows[0].institute_id + ')' : ''} was rejected by the developer.${reason ? '\n\nReason: ' + reason : ''}`);
            }
          } else {
            // fallback: remove from disk queue and email management
            const disk = readJsonFile(ORG_REQUESTS_FILE);
            const idx = disk.findIndex(x => x.token === token && (x.status || 'pending') === 'pending');
            if (idx >= 0) {
              const entry = disk[idx];
              disk.splice(idx, 1);
              writeJsonFile(ORG_REQUESTS_FILE, disk);
              appendOutbox({ to: entry.managementEmail || entry.management_email, subject: 'Organization Code Request Rejected', text: `Your request for ${entry.orgType || entry.org_type} was rejected by the developer.${reason ? '\n\nReason: ' + reason : ''}` });
            }
          }
          processed++;
        }
      } catch (e) {
        logger.warn('Failed to process inbound message', e?.message || e);
      }
    }
    // Remove processed inbound messages (the file keeps only unhandled messages)
    const keep = readJsonFile(INBOUND_FILE).filter(m => !m.processed);
    writeJsonFile(INBOUND_FILE, keep);
  } catch (e) {
    logger.warn('Error processing inbound commands', e?.message || e);
  }
  return { processed };
}

async function runOnce() {
  logger.info('Outbox worker running (one-shot)');
  const i = await processInboxOnce();
  // handle inbound replies that may contain confirm/reject commands
  const cmd = await processInboundCommandsOnce();
  const o = await processOutboxOnce();
  const q = await processSignupQueueOnce();
  const org = await processOrgRequestsOnce();
  logger.info(`Outbox processed ${o.processed}, Queue processed ${q.processed}`);
  return { inboxProcessed: i && i.processed || 0, inboundCommandsProcessed: cmd && cmd.processed || 0, outboxProcessed: o.processed, queueProcessed: q.processed, orgRequestsProcessed: org.processed };
}

async function runLoop(intervalMs = Number(process.env.WORKER_INTERVAL_MS || 60000)) {
  logger.info('Outbox worker starting loop, interval', intervalMs);
  while (true) {
    try {
      await runOnce();
    } catch (e) {
      logger.warn('Worker runOnce error', e?.message || e);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

// CLI
const args = process.argv.slice(2);
const once = args.includes('--once') || args.includes('-1');
if (once) {
  runOnce().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  runLoop().catch(err => { logger.error('worker loop fatal', err); process.exit(2); });
}

module.exports = { processOutboxOnce, processSignupQueueOnce, processInboxOnce, processOrgRequestsOnce, processInboundCommandsOnce, runOnce, runLoop, appendOutbox, appendInbound, setSendEmail, setDb };
