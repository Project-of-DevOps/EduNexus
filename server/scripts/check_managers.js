require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    const supabase = createClient(url, key);

    try {
        const { data, error } = await supabase.from('management_managers').select('*');
        if (error) console.log('Error:', error.message);
        else console.log('Management Managers:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.log(e);
    }
})();
