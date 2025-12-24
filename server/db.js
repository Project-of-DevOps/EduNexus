const { Pool } = require('pg');
const path = require('path');
// dotenv is loaded in index.js, no need to reload here
// require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Robust configuration for Supabase
const createPool = () => {
    // Check if DATABASE_URL is present
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing!');
    }

    try {
        const connectionString = process.env.DATABASE_URL;
        // Use Pool for better connection management in a server environment
        const useSsl = (process.env.DB_SSL === 'true') || (connectionString && connectionString.includes('sslmode=require')) || (process.env.NODE_ENV === 'production');
        const poolConfig = {
            connectionString,
            connectionTimeoutMillis: 30000,
            ssl: useSsl ? { rejectUnauthorized: false } : false
        };
        // If specific parsing is needed, we can do it, but connectionString usually suffices for pg
        return new Pool(poolConfig);
    } catch (e) {
        console.error('Invalid DATABASE_URL configuration', e);
        return new Pool({ connectionString: process.env.DATABASE_URL });
    }
};

const pool = createPool();

// Handle unexpected client errors to prevent unhandled 'error' events crashing the process.
if (pool && typeof pool.on === 'function') {
    pool.on('error', (err) => {
        console.error('Unexpected DB client error', err?.message || err);
        // Use process.stderr to ensure visibility in hosting environments
        try { process.stderr.write(`DB client error: ${String(err?.message || err)}\n`); } catch (e) { /* ignore */ }
    });
}

// Helper for single query execution
const query = async (text, params) => {
    try {
        const res = await pool.query(text, params);
        return res;
    } catch (err) {
        console.error('Database Query Error:', err);
        throw err;
    }
};

module.exports = {
    pool,
    users: {
        // Create user
        create: async (user) => {
            const text = `
                INSERT INTO users (name, email, password_hash, role, extra)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const values = [user.name, user.email, user.password_hash, user.role, user.extra || {}];
            const res = await query(text, values);
            return res.rows[0];
        },

        // Find by email
        findByEmail: async (email) => {
            const text = `SELECT * FROM users WHERE email = $1`;
            const res = await query(text, [email]);
            return res.rows[0];
        },

        // Find by ID
        findById: async (id) => {
            const text = `SELECT * FROM users WHERE id = $1`;
            const res = await query(text, [id]);
            return res.rows[0];
        },

        // Update user
        update: async (id, updates) => {
            // Filter keys that exist in schema
            const allowed = ['name', 'email', 'password_hash', 'role', 'extra'];
            const keys = Object.keys(updates).filter(k => allowed.includes(k));

            if (keys.length === 0) return null;

            const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
            const values = [id, ...keys.map(k => updates[k])];

            const text = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
            const res = await query(text, values);
            return res.rows[0];
        },

        all: async () => {
            const res = await query('SELECT * FROM users');
            return res.rows;
        }
    },

    orgCodeRequests: {
        create: async (data) => {
            const text = `INSERT INTO org_code_requests (token, management_email, org_type, institute_id) VALUES ($1, $2, $3, $4) RETURNING *`;
            const values = [data.token, data.management_email, data.org_type, data.institute_id];
            await query(text, values);
        },
        findByToken: async (token) => {
            const res = await query(`SELECT * FROM org_code_requests WHERE token = $1`, [token]);
            return res.rows[0];
        },
        findPending: async (email, type, id) => {
            const res = await query(
                `SELECT * FROM org_code_requests WHERE management_email = $1 AND org_type = $2 AND institute_id = $3 AND status = 'pending'`,
                [email, type, id]
            );
            return res.rows[0];
        },
        updateStatus: async (token, status) => {
            await query(`UPDATE org_code_requests SET status = $1 WHERE token = $2`, [status, token]);
        }
    },
    passwordResets: {
        create: async (data) => {
            await query(`INSERT INTO password_resets (email, otp, expires_at) VALUES ($1, $2, $3)`, [data.email, data.otp, data.expires_at]);
        },
        findValid: async (email, otp) => {
            const res = await query(`SELECT * FROM password_resets WHERE email = $1 AND otp = $2 AND expires_at > NOW()`, [email, otp]);
            return res.rows[0];
        },
        deleteByEmail: async (email) => {
            await query(`DELETE FROM password_resets WHERE email = $1`, [email]);
        }
    },
    emailVerifications: {
        create: async (data) => {
            await query(`INSERT INTO email_verifications (email, token, expires_at) VALUES ($1, $2, $3)`, [data.email, data.token, data.expires_at]);
        },
        findValid: async (token) => {
            const res = await query(`SELECT * FROM email_verifications WHERE token = $1 AND expires_at > NOW()`, [token]);
            return res.rows[0];
        },
        deleteByToken: async (token) => {
            await query(`DELETE FROM email_verifications WHERE token = $1`, [token]);
        }
    },
    auditLogs: {
        log: async (event) => {
            console.log('Audit Log:', event);
            // Implement persistence if needed
        }
    }
};
