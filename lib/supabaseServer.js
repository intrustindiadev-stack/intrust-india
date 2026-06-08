import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import https from 'https'
import { URL } from 'url'

// Persistent HTTPS Keep-Alive Agent for Supabase requests.
// This reuses TCP sockets across requests, avoiding the ~45% handshake drop issue.
const supabaseKeepAliveAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 60000,
    maxSockets: 15,
    maxFreeSockets: 10,
    timeout: 4000, // 4 seconds connect/inactivity timeout
});

async function supabaseCustomFetch(urlStr, options = {}) {
    const maxAttempts = 3;
    const OVERALL_DEADLINE_MS = 10_000; // hard ceiling across all attempts
    const startTime = Date.now();
    let attempt = 0;

    while (true) {
        attempt++;
        try {
            const response = await new Promise((resolve, reject) => {
                const parsedUrl = new URL(urlStr);
                const headers = {};
                if (options.headers) {
                    if (typeof options.headers.forEach === 'function') {
                        options.headers.forEach((value, key) => {
                            headers[key] = value;
                        });
                    } else if (typeof options.headers.entries === 'function') {
                        for (const [key, value] of options.headers.entries()) {
                            headers[key] = value;
                        }
                    } else {
                        Object.assign(headers, options.headers);
                    }
                }
                
                let body = options.body;
                if (body && typeof body === 'object') {
                    body = JSON.stringify(body);
                }

                // Ensure Content-Length is set for body requests so
                // Node.js http.request sends the correct number of bytes.
                let bodyBuffer = null;
                if (body) {
                    bodyBuffer = Buffer.from(body, 'utf-8');
                    headers['content-length'] = String(bodyBuffer.byteLength);
                }
                
                const reqOpts = {
                    method: options.method || 'GET',
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || 443,
                    path: parsedUrl.pathname + parsedUrl.search,
                    headers: headers,
                    agent: supabaseKeepAliveAgent,
                    timeout: 4000, // 4s per-attempt (matches agent timeout)
                };
                
                const req = https.request(reqOpts, (res) => {
                    const chunks = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        const responseHeaders = new Headers(res.headers);
                        const responseBody = (res.statusCode === 204 || res.statusCode === 205 || res.statusCode === 304) ? null : buffer;
                        const responseObj = new Response(responseBody, {
                            status: res.statusCode,
                            statusText: res.statusMessage,
                            headers: responseHeaders,
                        });
                        resolve(responseObj);
                    });
                });
                
                req.on('error', (err) => {
                    reject(err);
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    const err = new Error('ConnectTimeoutError');
                    err.code = 'UND_ERR_CONNECT_TIMEOUT';
                    reject(err);
                });
                
                if (bodyBuffer) {
                    req.write(bodyBuffer);
                }
                req.end();
            });
            return response;
        } catch (err) {
            const isConnectError = 
                err.name === 'ConnectTimeoutError' ||
                err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                err.message?.includes('fetch failed') ||
                err.message?.includes('UND_ERR_CONNECT_TIMEOUT') ||
                err.code === 'ECONNRESET' ||
                err.message?.includes('ECONNRESET') ||
                err.message?.includes('connect timeout');

            if (isConnectError && attempt < maxAttempts) {
                const backoff = 200 * Math.pow(2, attempt - 1); // 200ms, 400ms
                const elapsed = Date.now() - startTime;
                if (elapsed + backoff > OVERALL_DEADLINE_MS) {
                    console.warn(
                        `[Supabase Fetch Retry] Overall deadline would be exceeded (${elapsed}ms elapsed + ${backoff}ms backoff > ${OVERALL_DEADLINE_MS}ms). Giving up.`
                    );
                    throw err;
                }
                console.warn(
                    `[Supabase Fetch Retry] Connection failure (attempt ${attempt}/${maxAttempts}). Error: ${err.message || err}. Retrying in ${backoff}ms...`
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


