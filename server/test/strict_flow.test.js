import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

// Helper to run SQL file
async function runSqlFile(file) {
  const sql = fs.readFileSync(file, 'utf8');
  // split by ';\n' naively for multi statements; better to run whole file
  await pool.query(sql);
}

describe('Strict flow integration test', () => {
  beforeAll(async () => {
    // Run core rebuild and migrations in order
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = [
      '009_master_rebuild.sql',
      '005_unified_users.sql',
      '007_role_tables_policy.sql',
      '011_security_and_policies.sql',
      '010_seed_strict_simulation.sql'
    ];
    for (const f of files) {
      const p = path.join(migrationsDir, f);
      console.log('Running migration:', p);
      const sql = fs.readFileSync(p, 'utf8');
      await pool.query(sql);
    }
  }, 120000);

  afterAll(async () => {
    // clean up - drop tables created by the master rebuild
    await pool.query(`DROP TABLE IF EXISTS public.parent_student_links CASCADE;
      DROP TABLE IF EXISTS public.student_enrollments CASCADE;
      DROP TABLE IF EXISTS public.class_assignments CASCADE;
      DROP TABLE IF EXISTS public.classes CASCADE;
      DROP TABLE IF EXISTS public.org_members CASCADE;
      DROP TABLE IF EXISTS public.organizations CASCADE;
      DROP TABLE IF EXISTS public.profiles CASCADE;`);
    await pool.end();
  });

  it('has created organization, classes, members, enrollments and parent links', async () => {
    const org = await pool.query("SELECT * FROM public.organizations WHERE code = 'SCH-999'");
    expect(org.rows.length).toBe(1);

    const members = await pool.query('SELECT * FROM public.org_members WHERE status = $1', ['approved']);
    expect(members.rows.length).toBeGreaterThanOrEqual(3);

    const classes = await pool.query('SELECT * FROM public.classes WHERE org_id = $1', [org.rows[0].id]);
    expect(classes.rows.length).toBeGreaterThanOrEqual(2);

    const enrollments = await pool.query('SELECT * FROM public.student_enrollments WHERE org_id = $1', [org.rows[0].id]);
    expect(enrollments.rows.length).toBe(2);

    const links = await pool.query('SELECT * FROM public.parent_student_links WHERE parent_id IS NOT NULL');
    expect(links.rows.length).toBe(2);
  });

  it('ensures unique email across users', async () => {
    // Try to insert duplicate profile email
    const res = await pool.query("SELECT id FROM public.users WHERE email = 'bart@edu.com'");
    expect(res.rows.length).toBe(1);

    let failed = false;
    try {
      await pool.query("INSERT INTO public.users (id,email,full_name,role) VALUES (gen_random_uuid(),'bart@edu.com','Duplicate Bart','student')");
    } catch (e) {
      failed = true;
      // expecting unique violation
      expect(e.code).toBe('23505');
    }
    expect(failed).toBe(true);
  });
});
