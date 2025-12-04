const { Pool } = require('pg');

// Build a safe default connection string using env vars, falling back to the
// user-provided db password 'root123' if nothing else is set. This mirrors the
// user's preference while still letting DATABASE_URL override everything.
const host = process.env.PGHOST || 'localhost';
const port = process.env.PGPORT || '5432';
const database = process.env.PGDATABASE || process.env.DB_NAME || 'edunexus_db';
const user = process.env.PGUSER || 'postgres';
const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'root123';

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION || `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

const pool = new Pool({ connectionString, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });

// Expose a helper to check DB connectivity that callers can use for graceful
// fallbacks. This ensures we don't crash the main process if the DB is down.
let _dbConnected = false;
let _checkConnectionImpl = async () => {
	try {
		const client = await pool.connect();
		client.release();
		_dbConnected = true;
		return true;
	} catch (e) {
		_dbConnected = false;
		return false;
	}
};

const checkConnection = async () => _checkConnectionImpl();

const setCheckConnection = (fn) => { if (typeof fn === 'function') _checkConnectionImpl = fn; };


// Run a quick connectivity check at startup (non-blocking)
void checkConnection();

module.exports = { pool, checkConnection, setCheckConnection, getDbConnected: () => _dbConnected };
