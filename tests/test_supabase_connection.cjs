
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function check() {
    console.log('--- SUPABASE CONNECTION TEST ---');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('URL:', url);
    console.log('Key length:', key ? key.length : 0);

    if (!url || !key) {
        console.error('Missing credentials');
        return;
    }

    const sb = createClient(url, key);
    try {
        const { data, error } = await sb.from('users').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Supabase Connection SUCCESS! User count:', data);
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

check();
