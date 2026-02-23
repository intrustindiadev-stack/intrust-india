import { createBrowserClient } from '@supabase/ssr'

// Browser-safe Supabase client
// Uses NEXT_PUBLIC_SUPABASE_ANON_KEY (safe to expose)
// Respects Row Level Security policies
// For use in Client Components only

let client

export function createClient() {
    if (client) return client

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        )
    }

    client = createBrowserClient(supabaseUrl, supabaseAnonKey)

    // Suppress Next.js dev overlay for this specific unavoidable background auto-refresh error
    if (typeof window !== 'undefined') {
        const originalConsoleError = console.error;
        console.error = (...args) => {
            if (
                typeof args[0] === 'string' &&
                args[0].includes('AuthApiError') &&
                args[0].includes('Refresh Token Not Found')
            ) {
                console.warn('Supabase Auth: Suppressed Invalid Refresh Token error to prevent dev overlay.');
                return;
            }
            if (args[0]?.message?.includes('Refresh Token Not Found')) {
                return;
            }
            originalConsoleError(...args);
        };
    }

    return client
}

// Export singleton instance
export const supabase = createClient()
