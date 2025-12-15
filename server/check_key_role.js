
const jwt = require('jsonwebtoken');
require('dotenv').config();

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
    console.log("No key found");
    process.exit(1);
}

const decoded = jwt.decode(key);
console.log("Key Role:", decoded.role);
