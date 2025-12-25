import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { pool } = require('../db');
const { app, setSupabaseDownUntil, setSupabaseClient } = require('../index');

const SUPA_FILE = path.join(__dirname, '..', 'data', 'supabase_sync_queue.json');

beforeAll(async () => {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = ['009_master_rebuild.sql','005_unified_users.sql','007_role_tables_policy.sql','011_security_and_policies.sql'];
  for (const f of files) {
    const p = path.join(migrationsDir, f);
    const sql = fs.readFileSync(p, 'utf8');
    await pool.query(sql);
  }
});

afterAll(async () => {
  await pool.query(`DROP TABLE IF EXISTS public.parent_student_links CASCADE; DROP TABLE IF EXISTS public.student_enrollments CASCADE; DROP TABLE IF EXISTS public.class_assignments CASCADE; DROP TABLE IF EXISTS public.classes CASCADE; DROP TABLE IF EXISTS public.org_members CASCADE; DROP TABLE IF EXISTS public.organizations CASCADE; DROP TABLE IF EXISTS public.users CASCADE;`);
  await pool.end();
});

describe('Signup scenarios (Supabase down / up)', () => {
  it('creates local user + role row and enqueues sync when Supabase is marked down', async () => {
    setSupabaseDownUntil(Date.now() + 60_000);
    const email = `sdown_${Date.now()}@test.local`;
    const res = await request(app).post('/api/py/signup').send({ name: 'SDown', email, password: 'Password1!', role: 'Management' }).timeout(60000);
    expect(res.status).toBe(200);
    // check local DB
    const u = await pool.query('SELECT id,email,role FROM users WHERE email=$1', [email]);
    expect(u.rows.length).toBe(1);
    const userId = u.rows[0].id;
    const mgr = await pool.query('SELECT id,user_id FROM management_managers WHERE user_id=$1', [userId]);
    expect(mgr.rows.length).toBe(1);
    // check supabase sync queue contains an item for this localUserId
    const q = JSON.parse(fs.readFileSync(SUPA_FILE, 'utf8'));
    const found = q.find(i => i.action === 'create_user' && i.localUserId === userId);
    expect(found).toBeTruthy();
  });

  it('when Supabase client responds successfully, signup uses Supabase path and returns supabase id', async () => {
    // Provide a mock supabase client that simulates success
    const fakeId = 'mock-supa-id-' + Date.now();
    const mockSupabase = {
      auth: {
        admin: {
          createUser: async ({ email, password, user_metadata }) => ({ user: { id: fakeId } })
        }
      },
      from: (table) => ({ insert: async (obj) => ({ data: obj, error: null }) })
    };
    setSupabaseDownUntil(0);
    setSupabaseClient(mockSupabase);

    const email = `supaup_${Date.now()}@test.local`;
    const res = await request(app).post('/api/py/signup').send({ name: 'SupUp', email, password: 'Password1!', role: 'Management' }).timeout(60000);
    expect(res.status).toBe(200);
    // Should return supabase user id
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(fakeId);
    // Since supabase path succeeded, local DB will not necessarily have role row, but Supabase has it (we simulated insert).
  });
});