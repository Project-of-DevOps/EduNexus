require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { pool } = require('../db');
(async ()=>{
  try{
    const users = await pool.query('SELECT COUNT(*) AS c FROM users');
    console.log('users:', users.rows[0].c);
    const orgs = await pool.query('SELECT COUNT(*) AS c FROM organizations');
    console.log('organizations:', orgs.rows[0].c);
    const classes = await pool.query("SELECT COUNT(*) AS c FROM classes");
    console.log('classes:', classes.rows[0].c);
  } catch (e) {
    console.error('Error:', e.message || e);
  } finally { await pool.end(); }
})();