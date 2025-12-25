import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { pool } = require('../db');
const { app } = require('../index');

describe('Duplicate signup race test', () => {
  beforeAll(async () => {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = ['009_master_rebuild.sql','005_unified_users.sql','007_role_tables_policy.sql','011_security_and_policies.sql'];
    for (const f of files) {
      const p = path.join(migrationsDir, f);
      const sql = fs.readFileSync(p, 'utf8');
      await pool.query(sql);
    }
  }, 120000);

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS public.parent_student_links CASCADE; DROP TABLE IF EXISTS public.student_enrollments CASCADE; DROP TABLE IF EXISTS public.class_assignments CASCADE; DROP TABLE IF EXISTS public.classes CASCADE; DROP TABLE IF EXISTS public.org_members CASCADE; DROP TABLE IF EXISTS public.organizations CASCADE; DROP TABLE IF EXISTS public.users CASCADE;`);
    await pool.end();
  });

  it('two concurrent signups with same email - one should fail with 400', async () => {
    const email = `race_${Date.now()}@test.local`;
    const send = () => request(app).post('/api/py/signup').send({ name: 'R', email, password: 'Password1!', role: 'Management' }).timeout(60000);
    const [r1, r2] = await Promise.all([send(), send()]);

    const statuses = [r1.status, r2.status];
    expect(statuses).toContain(400);
    expect(statuses).toContainEqual(expect.any(Number));

    const bad = r1.status === 400 ? r1 : r2.status === 400 ? r2 : null;
    expect(bad).not.toBeNull();
    expect(bad.body).toHaveProperty('detail');
    expect(String(bad.body.detail).toLowerCase()).toContain('email');
  });
});