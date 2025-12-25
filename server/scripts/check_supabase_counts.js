require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
(async ()=>{
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured in server/.env');
    process.exit(2);
  }
  try {
    const supabase = createClient(url, key);
    const tables = ['users','organizations','classes','teachers','student_enrollments','parent_student_links'];
    for (const t of tables) {
      try {
        const { data, error } = await supabase.from(t).select('id', { count: 'exact' });
        if (error) console.log(`${t}: ERROR (${error.message})`);
        else console.log(`${t}: ${data ? data.length : 0}`);
      } catch (e) {
        console.log(`${t}: ERROR (${e.message || e})`);
      }
    }
  } catch (e) {
    console.error('Supabase check failed:', e.message || e);
    process.exit(1);
  }
})();