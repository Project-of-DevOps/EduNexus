/*
Dev seeding script to create management user, institute, org_code, and a teacher user.
Usage: node server/scripts/seed_dev_data.js
Environment: Loads root .env. If SUPABASE envs are present, it will also create supabase entries.

Note: This script is intended for development only. It checks for existing entries and is reasonably idempotent.
*/

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

// Safety gate: require explicit ENABLE_DEV_ROUTES=true in production to avoid accidental seeding
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_ROUTES !== 'true') {
  console.error('Refusing to run seed in production. Set ENABLE_DEV_ROUTES=true to override.');
  process.exit(1);
}

console.log('Running dev seed script (dev routes enabled:', process.env.ENABLE_DEV_ROUTES === 'true' || process.env.NODE_ENV !== 'production', ')');
const { createClient } = require('@supabase/supabase-js');
const db = require('../db');
const bcrypt = require('bcrypt');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const DEFAULTS = {
  managerEmail: process.env.DEV_MANAGER_EMAIL || 'dev.manager@example.com',
  managerName: process.env.DEV_MANAGER_NAME || 'Dev Manager',
  managerPassword: process.env.DEV_MANAGER_PASSWORD || 'Password123!',
  teacherEmail: process.env.DEV_TEACHER_EMAIL || 'dev.teacher@example.com',
  teacherName: process.env.DEV_TEACHER_NAME || 'Dev Teacher',
  teacherPassword: process.env.DEV_TEACHER_PASSWORD || 'Password123!'
};

async function ensureManagement() {
  console.log('Ensuring management user...');
  const existing = await db.users.findByEmail(DEFAULTS.managerEmail);
  if (existing) {
    console.log('Management user already exists in Postgres:', existing.email);
    return existing;
  }

  const hashed = await bcrypt.hash(DEFAULTS.managerPassword, 10);
  const user = await db.users.create({ name: DEFAULTS.managerName, email: DEFAULTS.managerEmail, password_hash: hashed, role: 'Management' });
  console.log('Created Postgres management user:', user.email, user.id);

  // management_managers table
  try {
    await db.pool.query('INSERT INTO management_managers (user_id, name, email, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING', [user.id, DEFAULTS.managerName, DEFAULTS.managerEmail, 'Manager']);
    console.log('Created management_managers entry (if not existed)');
  } catch (e) { console.warn('Failed to insert into management_managers', e.message || e); }

  // Also create in Supabase if configured
  if (supabase) {
    try {
      const { data } = await supabase.from('users').select('id').eq('email', DEFAULTS.managerEmail);
      if (!data || data.length === 0) {
        await supabase.from('users').insert({ name: DEFAULTS.managerName, email: DEFAULTS.managerEmail, password_hash: hashed, role: 'Management' });
        console.log('Created Supabase management user');
      } else {
        console.log('Supabase management user already exists');
      }
      await supabase.from('management_managers').insert({ user_id: user.id, name: DEFAULTS.managerName, email: DEFAULTS.managerEmail, role: 'Manager' }).then(() => console.log('Created Supabase management_managers'));
    } catch (e) { console.warn('Supabase: failed to create management user/manager:', e.message || e); }
  }

  return user;
}

async function ensureInstituteAndCode(manager) {
  console.log('Ensuring institute and org_code...');
  // create institute
  const instituteName = process.env.DEV_INSTITUTE_NAME || 'Dev Institute';
  let inst;
  try {
    const r = await db.pool.query('SELECT id,name FROM institutes WHERE LOWER(name)=LOWER($1) LIMIT 1', [instituteName]);
    if (r.rows.length) inst = r.rows[0];
    if (!inst) {
      const insRes = await db.pool.query('INSERT INTO institutes (name, owner_id) VALUES ($1,$2) RETURNING id,name', [instituteName, manager.id]);
      inst = insRes.rows[0];
      console.log('Created institute:', inst);
    } else console.log('Institute exists:', inst);
  } catch (e) { console.warn('Failed to create/find institute', e.message || e); }

  // create org_code
  const code = process.env.DEV_ORG_CODE || `DEV${Math.floor(Math.random()*9000)+1000}`;
  try {
    const r = await db.pool.query('SELECT id,code FROM org_codes WHERE code=$1 LIMIT 1', [code]);
    if (r.rows.length) {
      console.log('Org code already exists:', r.rows[0]);
      return { institute: inst, code: r.rows[0] };
    }
    const res = await db.pool.query('INSERT INTO org_codes (code, type, institute_id, created_by) VALUES ($1,$2,$3,$4) RETURNING id, code', [code, 'institute', inst && inst.id, manager.id]);
    console.log('Created org_code:', res.rows[0]);
    return { institute: inst, code: res.rows[0] };
  } catch (e) { console.warn('Failed to create org_code', e.message || e); return { institute: inst, code: null }; }
}

async function ensureTeacher(instituteId) {
  console.log('Ensuring teacher user...');
  const existing = await db.users.findByEmail(DEFAULTS.teacherEmail);
  if (existing) {
    console.log('Teacher exists in Postgres:', existing.email);
    try {
      await db.pool.query('INSERT INTO teachers (user_id, institute_id, is_verified) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO NOTHING', [existing.id, instituteId, true]);
      console.log('Ensured teacher profile exists');
    } catch (e) { console.warn('Failed to ensure teacher profile', e.message || e); }
    return existing;
  }

  const hashed = await bcrypt.hash(DEFAULTS.teacherPassword, 10);
  const teacherUser = await db.users.create({ name: DEFAULTS.teacherName, email: DEFAULTS.teacherEmail, password_hash: hashed, role: 'Teacher', extra: { instituteId } });
  console.log('Created teacher user in Postgres:', teacherUser.email, teacherUser.id);
  try {
    await db.pool.query('INSERT INTO teachers (user_id, institute_id, is_verified) VALUES ($1,$2,$3)', [teacherUser.id, instituteId, true]);
    console.log('Created teacher profile (verified)');
  } catch (e) { console.warn('Failed to insert into teachers', e.message || e); }

  if (supabase) {
    try {
      await supabase.from('users').insert({ name: DEFAULTS.teacherName, email: DEFAULTS.teacherEmail, password_hash: hashed, role: 'Teacher', extra: JSON.stringify({ instituteId }) });
      console.log('Created teacher in Supabase');
      await supabase.from('teachers').insert({ user_id: teacherUser.id, institute_id: instituteId, is_verified: true });
    } catch (e) { console.warn('Supabase: failed to create teacher', e.message || e); }
  }

  return teacherUser;
}

(async () => {
  try {
    const manager = await ensureManagement();
    const { institute, code } = await ensureInstituteAndCode(manager);
    const teacher = await ensureTeacher(institute && institute.id);

    console.log('\nSeeding complete.');
    console.log('Manager:', manager.email);
    console.log('Institute:', institute && institute.name, institute && institute.id);
    console.log('Org Code:', code && code.code);
    console.log('Teacher:', teacher.email);
    console.log('\nYou can now try to login the teacher using /api/py/signin with role "Teacher" and the password from DEV_TEACHER_PASSWORD (default: Password123!).');
  } catch (e) {
    console.error('Seeding failed:', e && (e.message || e));
    process.exit(1);
  } finally {
    console.log('Seed script finished.');
    // Do not forcibly exit to allow output to flush and for the caller to inspect; exit normally
  }
})();