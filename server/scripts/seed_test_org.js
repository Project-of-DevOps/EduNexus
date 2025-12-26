require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const db = require('../db');
const crypto = require('crypto');

async function seed() {
    try {
        const timestamp = Date.now();
        const mgmtEmail = `mgmt_${timestamp}@test.edu`;
        const mgmtName = `Mgmt User ${timestamp}`;

        // 1. Create Management User
        const userRes = await db.pool.query(
            "INSERT INTO users (email, name, role, password_hash, extra) VALUES ($1, $2, 'management', 'hashed_pw', '{}') RETURNING id",
            [mgmtEmail, mgmtName]
        );
        const userId = userRes.rows[0].id;

        // 2. Create Organization
        const orgCode = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
        const orgRes = await db.pool.query(
            "INSERT INTO organizations (name, code, type, owner_id) VALUES ($1, $2, 'school', $3) RETURNING id, code, name",
            [`Test School ${timestamp}`, orgCode, userId]
        );
        const org = orgRes.rows[0];

        // 3. Link User to Org
        await db.pool.query(
            "INSERT INTO org_members (user_id, org_id, status, assigned_role_title) VALUES ($1, $2, 'approved', 'Principal')",
            [userId, org.id]
        );

        // 4. Create Class
        const classRes = await db.pool.query(
            "INSERT INTO classes (name, org_id) VALUES ($1, $2) RETURNING id",
            [`Class ${timestamp}`, org.id]
        );
        const cls = classRes.rows[0];

        console.log("Seeded successfully: " + org.code);
        require('fs').writeFileSync('org_code.txt', org.code);

    } catch (err) {
        console.error(JSON.stringify({ error: err.message }));
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

seed();
