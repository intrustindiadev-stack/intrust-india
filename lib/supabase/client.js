import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Client for client-side usage (RLS applied)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for server-side usage (bypass RLS) - Use with caution!
// Only initialize if service key is available (server-side)
export const getServiceSupabase = () => {
    if (!supabaseServiceKey) {
        console.warn('Supabase Service Key missing, falling back to anon client (RLS applied).');
        return supabase;
    }
    return createClient(supabaseUrl, supabaseServiceKey);
};
