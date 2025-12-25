const { pool } = require('../db');
(async function(){
  try{
    const res = await pool.query("SELECT has_schema_privilege('authenticated','public','usage') as auth_usage, has_schema_privilege('anon','public','usage') as anon_usage");
    console.log('Schema privilege check:', res.rows[0]);
  }catch(e){
    console.error('Error:', e);
  }finally{
    await pool.end();
  }
})();
