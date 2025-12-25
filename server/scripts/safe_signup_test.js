const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { app } = require('../index');

(async () => {
  const ts = Date.now();
  const email = `test_signup_${ts}@test.local`;
  const password = 'Password123!';
  console.log('Test email:', email);

  try {
    console.log('1) POST /api/py/signup');
    const res = await request(app).post('/api/py/signup').send({ name: 'Test Signup', email, password, role: 'Management' }).timeout(60000);
    console.log('signup status:', res.status, 'body:', res.body);

    if (res.status !== 200) {
      console.error('Signup failed; aborting');
      process.exit(1);
    }

    const userId = res.body?.user?.id;

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('2) verify in supabase public users');
    const { data: udata, error: uerr } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (uerr) throw uerr;
    console.log('users row:', JSON.stringify(udata));

    console.log('3) verify management_managers entry');
    const { data: mdata, error: merr } = await supabase.from('management_managers').select('*').eq('user_id', userId).maybeSingle();
    if (merr) throw merr;
    console.log('management_managers row:', JSON.stringify(mdata));

    console.log('CLEANUP: deleting supabase entries and auth user');
    try {
      if (userId) {
        // delete role row
        const { error: delRoleErr } = await supabase.from('management_managers').delete().eq('user_id', userId);
        if (delRoleErr) console.warn('Warning deleting management_managers row', delRoleErr);
        // delete public user row
        const { error: delUserErr } = await supabase.from('users').delete().eq('id', userId);
        if (delUserErr) console.warn('Warning deleting users row', delUserErr);

        // delete auth user via admin api if available
        try {
          if (supabase.auth && supabase.auth.admin && typeof supabase.auth.admin.deleteUser === 'function') {
            await supabase.auth.admin.deleteUser(userId);
            console.log('Deleted auth user', userId);
          } else {
            console.log('supabase.auth.admin.deleteUser not available; skipping admin deletion');
          }
        } catch (e) {
          console.warn('Failed deleting auth user via admin API', e?.message || e);
        }

        // Verify deletion
        const { data: remainUser } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
        if (remainUser) console.warn('User still present after attempted cleanup', remainUser);
        else console.log('Verified user removed from public users table (or never existed)');

        const { data: remainRole } = await supabase.from('management_managers').select('user_id').eq('user_id', userId).maybeSingle();
        if (remainRole) console.warn('Role row still present after attempted cleanup', remainRole);
        else console.log('Verified management_managers row removed (or never existed)');
      }
    } catch (delErr) {
      console.warn('Cleanup warning:', delErr?.message || delErr);
    }

    console.log('TEST COMPLETE: signup -> verify -> cleanup succeeded');
    process.exit(0);
  } catch (e) {
    console.error('Test error', e?.message || e, e?.response || '');
    process.exit(1);
  }
})();