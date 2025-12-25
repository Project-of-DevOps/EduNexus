const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.DATABASE_URL) console.log('DATABASE_URL preview:', process.env.DATABASE_URL.slice(0,40) + '...');
