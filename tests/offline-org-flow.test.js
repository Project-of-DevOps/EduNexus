
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Import worker
const outboxWorker = require('../server/outboxWorker');

// Mock DB
const dbMock = {
    pool: {
        query: vi.fn(),
        connect: vi.fn()
    },
    checkConnection: vi.fn(),
    setCheckConnection: vi.fn()
};

// Inject mock
outboxWorker.setDb(dbMock);

const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const DISK_FILE = path.join(DATA_DIR, 'org_code_requests_disk.json');
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json');

describe('Offline Org Flow', () => {
    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Clean disk files
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(DISK_FILE, '[]');
        fs.writeFileSync(OUTBOX_FILE, '[]');
    });

    afterEach(() => {
        try { fs.unlinkSync(DISK_FILE); } catch (e) { }
        try { fs.unlinkSync(OUTBOX_FILE); } catch (e) { }
    });

    it('should sync offline confirmed request to DB', async () => {
        // 1. Setup disk state: Confirmed offline
        const diskState = [{
            token: 'offline_token',
            managementEmail: 'mgmt@test.com',
            orgType: 'school',
            status: 'confirmed',
            org_code: 'CODE123',
            processed: false
        }];
        fs.writeFileSync(DISK_FILE, JSON.stringify(diskState));

        // 2. Mock DB connection UP
        dbMock.checkConnection.mockResolvedValue(true);
        dbMock.pool.query.mockResolvedValue({ rows: [] }); // No existing record

        // 3. Run worker
        await outboxWorker.processOrgRequestsOnce();

        // 4. Verify DB insert called with correct status and code
        // The worker logic might vary slightly, let's check broadly
        expect(dbMock.pool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO org_code_requests'),
            expect.arrayContaining(['mgmt@test.com', 'school', 'offline_token', 'confirmed'])
        );

        // 5. Verify disk file updated (processed: true or removed)
        const diskContent = JSON.parse(fs.readFileSync(DISK_FILE, 'utf8'));
        expect(diskContent.length).toBe(0);
    });

    it('should sync offline rejected request to DB', async () => {
        // 1. Setup disk state: Rejected offline
        const diskState = [{
            token: 'reject_token',
            managementEmail: 'mgmt@test.com',
            orgType: 'school',
            status: 'rejected',
            processed: false
        }];
        fs.writeFileSync(DISK_FILE, JSON.stringify(diskState));

        // 2. Mock DB connection UP
        dbMock.checkConnection.mockResolvedValue(true);
        dbMock.pool.query.mockResolvedValue({ rows: [] }); // No existing record

        // 3. Run worker
        await outboxWorker.processOrgRequestsOnce();

        // 4. Verify DB insert called with correct status
        expect(dbMock.pool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO org_code_requests'),
            expect.arrayContaining(['mgmt@test.com', 'school', 'reject_token', 'rejected'])
        );
    });

    it('should update existing pending record in DB if confirmed offline', async () => {
        // 1. Setup disk state: Confirmed offline
        const diskState = [{
            token: 'pending_token',
            status: 'confirmed',
            org_code: 'NEWCODE',
            processed: false
        }];
        fs.writeFileSync(DISK_FILE, JSON.stringify(diskState));

        // 2. Mock DB connection UP
        dbMock.checkConnection.mockResolvedValue(true);
        // Mock finding existing record
        dbMock.pool.query.mockImplementation((query, params) => {
            if (query.includes('SELECT id')) {
                return Promise.resolve({ rows: [{ id: 1, status: 'pending' }] });
            }
            if (query.includes('UPDATE org_code_requests')) {
                return Promise.resolve({ rows: [] });
            }
            return Promise.resolve({ rows: [] });
        });

        // 3. Run worker
        await outboxWorker.processOrgRequestsOnce();

        // 4. Verify DB update called
        expect(dbMock.pool.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE org_code_requests SET status=$1'),
            expect.arrayContaining(['confirmed', 'NEWCODE', 'pending_token'])
        );
    });
});
