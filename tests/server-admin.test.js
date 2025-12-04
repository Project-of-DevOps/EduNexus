import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json');
const QUEUE_FILE = path.join(DATA_DIR, 'signup_queue_disk.json');

describe('server admin endpoints', () => {
  let app;
  beforeEach(async () => {
    // prepare small disk files
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify([{ id: 'out_test', to: 'x@test', subject: 't', text: 'hi', sent: false }]), 'utf8');
    fs.writeFileSync(QUEUE_FILE, JSON.stringify([{ id: 'q_test', email: 'q@test', password_hash: 'h' }]), 'utf8');

    process.env.ADMIN_API_KEY = 'testkey';
    const mod = await import('../server/index.js');
    // ensure pool is mocked to avoid DB calls
    if (typeof mod.setPool === 'function') mod.setPool({ query: () => Promise.resolve({ rows: [] }) });
    app = mod.app;
  });

  afterEach(() => {
    try { fs.unlinkSync(OUTBOX_FILE); } catch (e) { }
    try { fs.unlinkSync(QUEUE_FILE); } catch (e) { }
    delete process.env.ADMIN_API_KEY;
  });

  it('returns queue stats with valid admin key', async () => {
    const resp = await supertest(app).get('/api/admin/queue-stats').set('x-admin-key', 'testkey').expect(200);
    expect(resp.body.success).toBe(true);
    expect(typeof resp.body.stats.signupQueueCount).toBe('number');
    expect(typeof resp.body.stats.outboxCount).toBe('number');
  });

  it('returns outbox list and can retry', async () => {
    const resp = await supertest(app).get('/api/admin/outbox').set('x-admin-key', 'testkey').expect(200);
    expect(resp.body.success).toBe(true);
    expect(Array.isArray(resp.body.outbox)).toBe(true);

    // retry should return result array
    const r2 = await supertest(app).post('/api/admin/outbox/retry').set('x-admin-key', 'testkey').expect(200);
    expect(r2.body.success).toBe(true);
    expect(Array.isArray(r2.body.results)).toBe(true);
  });

  it('returns queue list and can retry queued signups', async () => {
    const r = await supertest(app).get('/api/admin/queue').set('x-admin-key', 'testkey').expect(200);
    expect(r.body.success).toBe(true);
    expect(Array.isArray(r.body.queue)).toBe(true);

    const r2 = await supertest(app).post('/api/admin/queue/retry').set('x-admin-key', 'testkey').expect(200);
    expect(r2.body.success).toBe(true);
    expect(Array.isArray(r2.body.results)).toBe(true);
  });
});
