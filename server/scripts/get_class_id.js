require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const db = require('../db');
async function run() {
    try {
        const res = await db.pool.query("SELECT id FROM classes ORDER BY created_at DESC LIMIT 1");
        if (res.rows.length) console.log('CLASS_ID:' + res.rows[0].id);
        else console.log('CLASS_ID:NONE');
    } catch (e) { console.error(e); }
    setTimeout(() => process.exit(0), 1000);
}
run();
