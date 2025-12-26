const db = require('../db');

async function checkUser() {
    const email = process.argv[2];
    if (!email) {
        console.log(JSON.stringify({ error: 'Email argument required' }));
        process.exit(1);
    }

    try {
        const res = await db.pool.query("SELECT * FROM users WHERE email = $1", [email]);
        console.log(JSON.stringify({
            exists: res.rows.length > 0,
            user: res.rows[0] || null
        }));
    } catch (err) {
        console.error(JSON.stringify({ error: err.message }));
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

checkUser();
