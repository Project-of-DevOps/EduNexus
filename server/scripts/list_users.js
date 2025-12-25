require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!url || !key) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, role, created_at');

        if (error) throw error;

        console.log('All Users:');
        users.forEach(u => {
            console.log(`${u.email} | ${u.role} | ${u.name} | ${u.id}`);
        });

    } catch (e) {
        console.error('Error:', e);
    }
})();
