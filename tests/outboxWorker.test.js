import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json');
const QUEUE_FILE = path.join(DATA_DIR, 'signup_queue_disk.json');
const ORG_REQ_FILE = path.join(DATA_DIR, 'org_code_requests_disk.json');
const INBOUND_FILE = path.join(DATA_DIR, 'inbound.json');

describe('outbox worker functions', () => {
  beforeEach(async () => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    // initial outbox and queue
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify([
      { id: 'o1', to: 'a@test', subject: 'hello', text: '1', sent: false },
      { id: 'o2', to: 'b@test', subject: 'hello', text: '2', sent: false }
    ]), 'utf8');

    fs.writeFileSync(QUEUE_FILE, JSON.stringify([
      { id: 'q1', email: 'q1@test', password_hash: 'h1' },
      { id: 'q2', email: 'q2@test', password_hash: 'h2' }
    ]), 'utf8');

    // Import worker and override its sendEmail to avoid real network I/O
    const worker = await import('../server/outboxWorker.js');
    if (typeof worker.setSendEmail === 'function') worker.setSendEmail(vi.fn(async () => true));
    else worker.sendEmailImpl = vi.fn(async () => true);

    // mock the DB pool so the worker can write to DB
    const db = await import('../server/db.js');
    db.pool.query = vi.fn(async () => ({ rows: [{ id: 'u' }] }));
    // Ensure the worker thinks DB is reachable in tests
    if (typeof db.setCheckConnection === 'function') db.setCheckConnection(vi.fn(async () => true));
    // ensure default files exist for new tests
    fs.writeFileSync(ORG_REQ_FILE, JSON.stringify([]), 'utf8');
    fs.writeFileSync(INBOUND_FILE, JSON.stringify([]), 'utf8');
  });

  afterEach(() => {
    try { fs.unlinkSync(OUTBOX_FILE); } catch (e) { }
    try { fs.unlinkSync(QUEUE_FILE); } catch (e) { }
    try { fs.unlinkSync(ORG_REQ_FILE); } catch (e) { }
    try { fs.unlinkSync(INBOUND_FILE); } catch (e) { }
  });

  it('processOutboxOnce sends queued mails and clears them', async () => {
    // ensure the worker is imported and uses our mock
    const worker = await import('../server/outboxWorker.js');
    const res = await worker.processOutboxOnce();
    expect(res.processed).toBe(2);
    const outbox = JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf8') || '[]');
    // since sendEmail returned true, outbox should be cleared
    expect(Array.isArray(outbox)).toBe(true);
    expect(outbox.length).toBe(0);
  });

  it('processSignupQueueOnce inserts queued signups into db and clears them', async () => {
    // ensure the worker is imported and uses our mock
    const worker = await import('../server/outboxWorker.js');
    const res = await worker.processSignupQueueOnce();
    // our mock pool returns success for each insert, so processed should be 2
    expect(res.processed).toBe(2);
    const q = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8') || '[]');
    expect(q.length).toBe(0);
  });

  it('processOrgRequestsOnce inserts disk requests into db and notifies dev', async () => {
    // prepare org requests on disk
    fs.writeFileSync(ORG_REQ_FILE, JSON.stringify([
      { id: 'o1', managementEmail: 'm1@test', orgType: 'institute', instituteId: 'inst1', token: 'tok1' },
      { id: 'o2', managementEmail: 'm2@test', orgType: 'school', instituteId: 'school1', token: 'tok2' }
    ]), 'utf8');
    const worker = await import('../server/outboxWorker.js');
    const res = await worker.processOrgRequestsOnce();
    expect(res.processed).toBe(2);
    const left = JSON.parse(fs.readFileSync(ORG_REQ_FILE, 'utf8') || '[]');
    expect(left.length).toBe(0);
  });

  it('processInboundCommandsOnce handles confirm and reject commands', async () => {
    const worker = await import('../server/outboxWorker.js');
    // mock DB responses for confirm and reject
    const db = await import('../server/db.js');
    // For confirm: update returns a row with management_email and org_type
    db.pool.query = vi.fn(async (q, params) => {
      if (String(q).includes('UPDATE org_code_requests SET status=$1, org_code=$2')) return { rows: [{ management_email: 'm1@test', org_type: 'institute', institute_id: 'inst1' }] };
      if (String(q).includes('UPDATE org_code_requests SET status=$1 WHERE token=$2')) return { rows: [{ management_email: 'm2@test', org_type: 'school', institute_id: 's1' }] };
      return { rows: [] };
    });

    // inbound messages with a confirm token and a reject token
    fs.writeFileSync(INBOUND_FILE, JSON.stringify([
      { id: 'i1', from: 'dev@test', subject: 'Confirm', body: '/api/org-code/confirm/tok123' },
      { id: 'i2', from: 'dev@test', subject: 'Reject', body: 'reject tok456\nreason: Not suitable' }
    ]), 'utf8');

    const res = await worker.processInboundCommandsOnce();
    expect(res.processed).toBeGreaterThanOrEqual(2);
    const left = JSON.parse(fs.readFileSync(INBOUND_FILE, 'utf8') || '[]');
    // processed inbound messages should be removed
    expect(left.length).toBe(0);
  });
});
