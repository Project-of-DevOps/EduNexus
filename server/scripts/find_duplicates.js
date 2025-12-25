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
        // Fetch all users
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, role, created_at');

        if (error) throw error;

        console.log(`Checking ${users.length} users for duplicates...`);

        const emailMap = {};
        const duplicates = [];

        for (const u of users) {
            const email = (u.email || '').toLowerCase();
            if (emailMap[email]) {
                duplicates.push(email);
                emailMap[email].push(u);
            } else {
                emailMap[email] = [u];
            }
        }

        const uniqueDupes = [...new Set(duplicates)];

        if (uniqueDupes.length === 0) {
            console.log('No duplicates found in Supabase public.users');
        } else {
            console.log(`Found ${uniqueDupes.length} duplicate sets:`);
            for (const email of uniqueDupes) {
                console.log(`\nEmail: ${email}`);
                const records = emailMap[email];
                records.forEach(r => {
                    console.log(` - ID: ${r.id}, Role: ${r.role}, Name: ${r.name}, Created: ${r.created_at}`);
                });
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
})();
