
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing in environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});

// Helper to inspect session in the browser console
export async function getCurrentSession() {
    try {
        // supabase.auth.getSession() returns { data: { session } }
        // use it to return the raw session object for debugging
        const res = await supabase.auth.getSession();
        return res.data ? res.data.session : null;
    } catch (e) {
        console.error('Failed to get session:', e);
        return null;
    }
}
