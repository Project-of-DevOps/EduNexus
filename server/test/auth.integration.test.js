import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { pool } = require('../db');
const { app } = require('../index');

// Helper to run SQL file
async function runSqlFile(file) {
  const sql = fs.readFileSync(file, 'utf8');
  await pool.query(sql);
}

describe('Auth integration tests', () => {
  beforeAll(async () => {
    // Ensure DB is reachable
    try {
      await pool.query('SELECT 1');
    } catch (e) {
      throw new Error('Postgres not available or DATABASE_URL invalid: ' + (e.message || e));
    }

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = [
      '009_master_rebuild.sql',
      '005_unified_users.sql',
      '007_role_tables_policy.sql',
      '011_security_and_policies.sql'
    ];
    for (const f of files) {
      const p = path.join(migrationsDir, f);
      const sql = fs.readFileSync(p, 'utf8');
      await pool.query(sql);
    }
  }, 120000);

  afterAll(async () => {
    // cleanup
    await pool.query(`DROP TABLE IF EXISTS public.parent_student_links CASCADE;
      DROP TABLE IF EXISTS public.student_enrollments CASCADE;
      DROP TABLE IF EXISTS public.class_assignments CASCADE;
      DROP TABLE IF EXISTS public.classes CASCADE;
      DROP TABLE IF EXISTS public.org_members CASCADE;
      DROP TABLE IF EXISTS public.organizations CASCADE;
      DROP TABLE IF EXISTS public.users CASCADE;`);
    await pool.end();
  });

  it('signin returns Unregistered for missing user', async () => {
    const res = await request(app)
      .post('/api/py/signin')
      .send({ email: 'nouser-integration@test.local', password: 'Password123!', role: 'Management' })
      .timeout(60000);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('detail');
    expect(String(res.body.detail).toLowerCase()).toContain('unregistered');
  });

  it('duplicate signup returns a conflict-like error', async () => {
    const email = 'duplicate@test.local';
    // First signup
    const r1 = await request(app).post('/api/py/signup').send({ name: 'Dup', email, password: 'Password123!', role: 'Management' }).timeout(60000);
    expect([200,201,204].includes(r1.status)).toBe(true);

    // Second signup should fail
    const r2 = await request(app).post('/api/py/signup').send({ name: 'Dup2', email, password: 'Password123!', role: 'Management' }).timeout(60000);
    expect(r2.status).not.toBe(200);
    expect(r2.body).toHaveProperty('detail');
    const txt = String(r2.body.detail).toLowerCase();
    expect(txt.includes('email') || txt.includes('already') || txt.includes('duplicate')).toBe(true);
  });

  it('signup then signin succeeds and wrong password fails', async () => {
    const email = 'integuser@test.local';
    const pass = 'Password123!';

    const signup = await request(app).post('/api/py/signup').send({ name: 'I User', email, password: pass, role: 'Management' }).timeout(60000);
    expect([200,201,204].includes(signup.status)).toBe(true);
    expect(signup.body).toHaveProperty('user');

    // Successful signin
    const signin = await request(app).post('/api/py/signin').send({ email, password: pass, role: 'Management' }).timeout(60000);
    expect(signin.status).toBe(200);
    expect(signin.body).toHaveProperty('token');
    expect(signin.body).toHaveProperty('user');

    // Wrong password
    const bad = await request(app).post('/api/py/signin').send({ email, password: 'WrongPass!', role: 'Management' }).timeout(60000);
    expect(bad.status).toBe(400);
    expect(bad.body).toHaveProperty('detail');
    expect(String(bad.body.detail).toLowerCase()).toContain('wrong');
  });
});
