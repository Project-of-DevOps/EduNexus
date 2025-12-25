require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const useSsl = (process.env.DB_SSL === 'true') || (connectionString && connectionString.includes('sslmode=require')) || (process.env.NODE_ENV === 'production');
const pool = new Pool({ connectionString, ssl: useSsl ? { rejectUnauthorized: false } : false });

(async () => {
  console.log('list_tables.js: starting');
  try {
    const res = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('list_tables.js: query returned, rows:', (res.rows || []).length);
    if (!res.rows.length) {
      console.log('No tables found in public schema');
      return;
    }
    console.log('Tables in public schema:');
    res.rows.forEach(r => console.log(`- ${r.table_name}`));
    console.log('\nTotal tables:', res.rows.length);
  } catch (e) {
    console.error('Error listing tables:', e.message || e);
  } finally {
    await pool.end();
  }
})();