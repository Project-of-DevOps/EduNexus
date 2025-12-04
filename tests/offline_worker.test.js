
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json');
const ORG_REQ_FILE = path.join(DATA_DIR, 'org_code_requests_disk.json');
const INBOUND_FILE = path.join(DATA_DIR, 'inbound.json');

describe('Offline Worker Flow', () => {
    beforeEach(async () => {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

        // Clear files
        fs.writeFileSync(OUTBOX_FILE, '[]', 'utf8');
        fs.writeFileSync(ORG_REQ_FILE, '[]', 'utf8');
        fs.writeFileSync(INBOUND_FILE, '[]', 'utf8');

        // Mock DB to be unreachable
        const db = require('../server/db.js');
        // Mock pool.query to throw
        db.pool.query = vi.fn(async () => { throw new Error('DB Down'); });
        // Mock checkConnection
        if (typeof db.setCheckConnection === 'function') db.setCheckConnection(vi.fn(async () => false));
        else db.checkConnection = vi.fn(async () => false);

        // Mock Email to capture sends
        const worker = require('../server/outboxWorker.js');
        worker.setSendEmail(vi.fn(async () => true));
    });

    afterEach(() => {
        try { fs.unlinkSync(OUTBOX_FILE); } catch (e) { }
        try { fs.unlinkSync(ORG_REQ_FILE); } catch (e) { }
        try { fs.unlinkSync(INBOUND_FILE); } catch (e) { }
    });

    it('processOrgRequestsOnce skips DB insert when DB is down but keeps items on disk', async () => {
        // Setup disk queue
        const reqs = [{ id: 'disk_1', managementEmail: 'm@test.com', orgType: 'institute', token: 'tok123', status: 'pending' }];
        fs.writeFileSync(ORG_REQ_FILE, JSON.stringify(reqs), 'utf8');

        const worker = require('../server/outboxWorker.js');
        const res = await worker.processOrgRequestsOnce();

        // Should process 0 because DB is down
        expect(res.processed).toBe(0);

        // File should still have the item
        const disk = JSON.parse(fs.readFileSync(ORG_REQ_FILE, 'utf8'));
        expect(disk.length).toBe(1);
        expect(disk[0].token).toBe('tok123');
    });

    it('processOutboxOnce sends emails even if DB is down', async () => {
        // Setup outbox
        const mails = [{ id: 'out_1', to: 'user@test.com', subject: 'Test', text: 'Body', sent: false }];
        fs.writeFileSync(OUTBOX_FILE, JSON.stringify(mails), 'utf8');

        const worker = require('../server/outboxWorker.js');

        const res = await worker.processOutboxOnce();

        expect(res.processed).toBe(1);

        // Outbox should be empty (sent)
        const disk = JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf8'));
        expect(disk.length).toBe(0);
    });

    it('processInboundCommandsOnce handles confirm command locally when DB is down', async () => {
        // Setup disk queue (pending request)
        const reqs = [{ id: 'disk_1', managementEmail: 'm@test.com', orgType: 'institute', token: 'tok123', status: 'pending' }];
        fs.writeFileSync(ORG_REQ_FILE, JSON.stringify(reqs), 'utf8');

        // Setup inbound command (confirm)
        const inbound = [{ id: 'in_1', from: 'dev@test.com', subject: 'Re: Request', body: 'confirm tok123' }];
        fs.writeFileSync(INBOUND_FILE, JSON.stringify(inbound), 'utf8');

        const worker = require('../server/outboxWorker.js');
        const res = await worker.processInboundCommandsOnce();

        expect(res.processed).toBe(1);

        // 1. Request should be removed from disk queue (processed/confirmed)
        const diskReqs = JSON.parse(fs.readFileSync(ORG_REQ_FILE, 'utf8'));
        expect(diskReqs.length).toBe(0);

        // 2. Outbox should have a confirmation email for management user
        const outbox = JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf8'));
        expect(outbox.length).toBe(1);
        expect(outbox[0].to).toBe('m@test.com');
        expect(outbox[0].subject).toContain('Approved');
    });
});
