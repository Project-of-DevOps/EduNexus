require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const db = require('../db');

async function getData() {
    try {
        // Get a valid Org (School)
        const orgRes = await db.pool.query("SELECT * FROM organizations WHERE type = 'school' LIMIT 1");
        const org = orgRes.rows[0];

        if (!org) {
            console.log(JSON.stringify({ error: 'No Organization Found' }));
            process.exit(1);
        }

        // Get a Class for this Org
        const classRes = await db.pool.query("SELECT * FROM classes WHERE org_id = $1 LIMIT 1", [org.id]);
        const cls = classRes.rows[0];

        // Get a Student (for Parent link test)
        const studentRes = await db.pool.query("SELECT * FROM users WHERE role = 'student' LIMIT 1");
        const student = studentRes.rows[0];

        console.log(JSON.stringify({
            org_code: org.code,
            org_id: org.id,
            class_id: cls ? cls.id : null,
            student_email: student ? student.email : null
        }));
    } catch (err) {
        console.error(JSON.stringify({ error: err.message }));
    } finally {
        // Use a timeout to allow pool to close if needed, though db.pool is usually global
        setTimeout(() => process.exit(0), 1000);
    }
}

getData();
