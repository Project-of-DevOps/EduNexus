require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const url = require('url');
const net = require('net');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL missing'); process.exit(1); }
const parsed = url.parse(dbUrl);
const host = parsed.hostname || parsed.host;
const port = parsed.port || 5432;

console.log('Checking TCP connection to', host, port);
const s = new net.Socket();
s.setTimeout(5000);
s.on('connect', () => { console.log('TCP connect ok'); s.destroy(); process.exit(0); });
s.on('timeout', () => { console.error('TCP connection timed out'); s.destroy(); process.exit(2); });
s.on('error', (e) => { console.error('TCP connection error:', e.message); process.exit(3); });
s.connect(port, host);