
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const ORG_REQ_FILE = path.join(DATA_DIR, 'org_code_requests_disk.json');

describe('Server Endpoints (DB Down)', () => {
    let app;
    let setPool;
    let token;

    beforeEach(async () => {
        vi.resetModules();
        process.env.JWT_SECRET = 'test_secret';
        process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db'; // satisfy env check

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(ORG_REQ_FILE, '[]', 'utf8');

        // Generate valid token
        token = jwt.sign({ id: 1, role: 'Management', email: 'admin@test.com' }, 'test_secret');

        // Load app via import
        const server = await import('../server/index.js');
        app = server.app;
        setPool = server.setPool;

        // Mock Pool
        const mockPool = {
            query: vi.fn(async () => { throw new Error('DB Down'); }),
            connect: vi.fn(async () => { throw new Error('DB Down'); })
        };
        setPool(mockPool);
    });

    afterEach(() => {
        try { fs.unlinkSync(ORG_REQ_FILE); } catch (e) { }
    });

    it('GET /api/org-code/requests returns disk items when DB is down', async () => {
        // Setup disk items
        const diskItems = [
            { id: 'disk_1', managementEmail: 'm@test.com', orgType: 'institute', token: 'tok1', status: 'pending', createdAt: new Date().toISOString() }
        ];
        fs.writeFileSync(ORG_REQ_FILE, JSON.stringify(diskItems), 'utf8');

        const res = await request(app)
            .get('/api/org-code/requests')
            .set('Cookie', [`accessToken=${token}`]);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.rows.length).toBe(1);
        expect(res.body.rows[0].token).toBe('tok1');
        expect(res.body.rows[0].status).toBe('pending');
    });

    it('GET /api/org-code/analytics returns disk stats when DB is down', async () => {
        // Setup disk items
        const diskItems = [
            { id: 'disk_1', orgType: 'institute', status: 'pending' },
            { id: 'disk_2', orgType: 'school', status: 'confirmed' },
            { id: 'disk_3', orgType: 'institute', status: 'pending' }
        ];
        fs.writeFileSync(ORG_REQ_FILE, JSON.stringify(diskItems), 'utf8');

        const res = await request(app)
            .get('/api/org-code/analytics')
            .set('Cookie', [`accessToken=${token}`]);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Check totals
        // pending: 2, confirmed: 1
        const pending = res.body.totals.find(t => t.status === 'pending');
        expect(pending).toBeDefined();
        expect(Number(pending.cnt)).toBe(2);

        // Check byOrgTypeAndStatus
        // institute|pending: 2
        const instPending = res.body.byOrgTypeAndStatus.find(r => r.orgType === 'institute' && r.status === 'pending');
        expect(instPending).toBeDefined();
        expect(Number(instPending.cnt)).toBe(2);
    });
});
