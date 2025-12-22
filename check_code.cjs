
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from server/.env
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in server/.env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCode(code) {
    console.log(`Checking for code/token: ${code}`);

    // Check org_codes
    const { data: codeData, error: codeError } = await supabase
        .table('org_codes')
        .select('*')
        .eq('code', code);

    if (codeData && codeData.length > 0) {
        console.log("FOUND in org_codes:", codeData);
    } else {
        console.log("NOT FOUND in org_codes");
    }

    // Check org_code_requests (if table exists)
    // We might not have this table if it's disk-based, but let's try.
    // Based on index.js, there is an INSERT attempt to 'org_code_requests'.
    const { data: reqData, error: reqError } = await supabase
        .table('org_code_requests')
        .select('*')
        .or(`code.eq.${code},token.eq.${code}`); // Check both code and token columns if they exist

    if (reqData && reqData.length > 0) {
        console.log("FOUND in org_code_requests:", reqData);
    } else if (reqError) {
        console.log("Error checking org_code_requests (table might not exist or schema differs):", reqError.message);
    } else {
        console.log("NOT FOUND in org_code_requests");
    }
}

checkCode('LRKPZ0N9L3');
