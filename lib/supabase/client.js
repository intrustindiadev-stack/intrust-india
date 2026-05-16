/**
 * @file lib/supabase/client.js
 *
 * Thin re-export — delegates to the canonical cookie-backed singleton in
 * lib/supabaseClient.js so that any component importing `supabase` from this
 * path gets the same GoTrueClient instance used by AuthContext.
 *
 * DO NOT import @supabase/supabase-js createClient or SUPABASE_SERVICE_ROLE_KEY
 * here — this file is safe to bundle into Client Components.
 */

export { supabase } from '@/lib/supabaseClient';

/**
 * Throwing stub — any server-side caller that was NOT migrated to
 * createAdminClient() in Steps 1–2 will fail loudly at runtime instead of
 * silently spawning a second GoTrueClient with the service key in the bundle.
 */
export const getServiceSupabase = () => {
    throw new Error(
        '[supabase] getServiceSupabase() has been removed. ' +
        'Use createAdminClient() from lib/supabaseServer instead.'
    );
};
