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

    return client
}

// Export singleton instance
export const supabase = createClient()
