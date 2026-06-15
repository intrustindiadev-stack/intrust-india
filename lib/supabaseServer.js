import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// supabaseCustomFetch
// ---------------------------------------------------------------------------
// Previously used a persistent https.Agent + 4 s timeouts to survive cross-
// internet latency to Supabase Cloud. Now that the backend is a loopback HTTP
// call (intrustindia.com/api/supabase → Kong:8000), the connection overhead
// is negligible and the 4 s deadline was artificially constraining slow
// server-side queries.
//
// Current config (self-hosted, loopback):
//   - Timeout: 30 s per attempt  (was 4 s)
//   - Max retries: 2 attempts    (was 3)
//   - Overall deadline: 60 s     (was 10 s)
//   - No custom https.Agent      (connections are http, not https, on loopback)
//
// ROLLBACK: To restore the old Cloud behaviour, revert this file to git HEAD
// and update NEXT_PUBLIC_SUPABASE_URL back to the Supabase Cloud URL.
// ---------------------------------------------------------------------------
async function supabaseCustomFetch(urlStr, options = {}) {
    const maxAttempts = 2;
    const OVERALL_DEADLINE_MS = 60_000; // 60 s hard ceiling
    const PER_ATTEMPT_TIMEOUT = 30_000; // 30 s per attempt
    const startTime = Date.now();
    let attempt = 0;

    while (true) {
        attempt++;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PER_ATTEMPT_TIMEOUT);
        try {
            const response = await fetch(urlStr, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timer);
            return response;
        } catch (err) {
            clearTimeout(timer);

            const isRetryable =
                err.name === 'AbortError' ||
                err.code === 'ECONNRESET' ||
                err.message?.includes('fetch failed') ||
                err.message?.includes('ECONNRESET') ||
                err.message?.includes('connect timeout');

            if (isRetryable && attempt < maxAttempts) {
                const backoff = 500 * attempt; // 500 ms, 1000 ms
                const elapsed = Date.now() - startTime;
                if (elapsed + backoff > OVERALL_DEADLINE_MS) {
                    console.warn(
                        `[Supabase Fetch] Overall deadline would be exceeded (${elapsed}ms + ${backoff}ms backoff > ${OVERALL_DEADLINE_MS}ms). Giving up.`
                    );
                    throw err;
                }
                console.warn(
                    `[Supabase Fetch] Attempt ${attempt}/${maxAttempts} failed (${err.message}). Retrying in ${backoff}ms...`
                );
                await new Promise((resolve) => setTimeout(resolve, backoff));
                continue;
            }
            throw err;
        }
    }
}

// Server-side Supabase client
// Uses service role key (NEVER expose to client)
// Bypasses Row Level Security - use with extreme caution
// For API routes and Server Components only

export async function createServerSupabaseClient() {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables')
    }

    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value
                },
                set(name, value, options) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name, options) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
            global: {
                fetch: supabaseCustomFetch,
            },
        }
    )
}

// Admin client with service role key (bypasses RLS)
// CRITICAL: Only use for admin operations
// NEVER import this in client components
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error(
            'Missing Supabase service role key. Required for admin operations.'
        )
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        },
        global: {
            fetch: supabaseCustomFetch,
        },
    })
}

// Static client that does not read cookies/headers (enables caching/ISR)
export function createStaticSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        )
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        },
        global: {
            fetch: supabaseCustomFetch,
        },
    })
}


