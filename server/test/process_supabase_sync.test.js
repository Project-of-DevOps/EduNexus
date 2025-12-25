import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const fs = require('fs');
const path = require('path');
const worker = require('../outboxWorker');
const SUPA_FILE = path.join(__dirname, '..', 'data', 'supabase_sync_queue.json');

describe('Supabase sync queue processing', () => {
  beforeEach(() => {
    // reset file
    fs.writeFileSync(SUPA_FILE, JSON.stringify([], null, 2), 'utf8');
  });

  afterEach(() => {
    fs.writeFileSync(SUPA_FILE, JSON.stringify([], null, 2), 'utf8');
    vi.restoreAllMocks();
  });

  it('processes a create_user item using a mocked supabase client', async () => {
    // write queue
    const entry = { id: 's1', action: 'create_user', payload: { email: 'mockuser@test.local', name: 'Mock User', role: 'Management' } };
    fs.writeFileSync(SUPA_FILE, JSON.stringify([entry], null, 2), 'utf8');

    // Mock @supabase/supabase-js createClient to return a fake client
    const fakeClient = {
      auth: { admin: { createUser: async ({ email, password, user_metadata }) => ({ user: { id: 'fake-id-1' } }) } },
      from: (table) => ({ insert: async (data) => ({ data: data, error: null }) })
    };

    // Monkeypatch the createClient import used by worker
    const supa = require('@supabase/supabase-js');
    vi.spyOn(supa, 'createClient').mockImplementation(() => fakeClient);

    const result = await worker.processSupabaseSyncQueueOnce();
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const q = JSON.parse(fs.readFileSync(SUPA_FILE, 'utf8'));
    expect(q.length).toBe(0); // processed and removed
  });
});