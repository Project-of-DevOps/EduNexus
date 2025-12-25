const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');
const { app } = require('../index');

async function run() {
  try {
    console.log('Applying migrations...');
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

    // 1. Signin missing
    console.log('1) signin missing user');
    let res = await request(app).post('/api/py/signin').send({ email: 'nouser-run@test.local', password: 'Password123!', role: 'Management' });
    console.log('status', res.status, 'body', res.body);

    // 2. Signup
    console.log('2) signup new user');
    res = await request(app).post('/api/py/signup').send({ name: 'Run User', email: 'runuser@test.local', password: 'Password123!', role: 'Management' });
    console.log('status', res.status, 'body', res.body);

    // 3. Duplicate signup
    console.log('3) duplicate signup');
    res = await request(app).post('/api/py/signup').send({ name: 'Run User Dup', email: 'runuser@test.local', password: 'Password123!', role: 'Management' });
    console.log('status', res.status, 'body', res.body);

    // 4. Signin correct
    console.log('4) signin correct');
    res = await request(app).post('/api/py/signin').send({ email: 'runuser@test.local', password: 'Password123!', role: 'Management' });
    console.log('status', res.status, 'body', res.body);

    // 5. Signin wrong password
    console.log('5) signin wrong password');
    res = await request(app).post('/api/py/signin').send({ email: 'runuser@test.local', password: 'WrongPass!', role: 'Management' });
    console.log('status', res.status, 'body', res.body);

    // Cleanup
    console.log('Cleaning up schema...');
    await pool.query(`DROP TABLE IF EXISTS public.parent_student_links CASCADE;
      DROP TABLE IF EXISTS public.student_enrollments CASCADE;
      DROP TABLE IF EXISTS public.class_assignments CASCADE;
      DROP TABLE IF EXISTS public.classes CASCADE;
      DROP TABLE IF EXISTS public.org_members CASCADE;
      DROP TABLE IF EXISTS public.organizations CASCADE;
      DROP TABLE IF EXISTS public.users CASCADE;`);

    await pool.end();
    console.log('Done.');
  } catch (e) {
    console.error('Error running quick integration:', e?.message || e);
    try { await pool.end(); } catch (err) { /* ignore */ }
    process.exit(1);
  }
}

run();
