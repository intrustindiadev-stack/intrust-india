import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        const admin = createAdminClient();

        // 1. Look up the user by email (using listUsers because direct auth.users access via PostgREST is blocked)
        const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({
            page: 1,
            perPage: 1000
        });
        if (listError) {
            console.error('[SIGNIN] listUsers error:', listError);
            return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
        }

        const existing = existingUsers?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (!existing) {
            // Generic message to prevent email enumeration
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        // 2. Check account lock status
        const { data: profile } = await admin
            .from('user_profiles')
            .select('failed_login_attempts, locked_until')
            .eq('id', existing.id)
            .maybeSingle();

        if (profile?.locked_until) {
            const lockedUntil = new Date(profile.locked_until);
            if (lockedUntil > new Date()) {
                const remainingMs = lockedUntil - new Date();
                const remainingMins = Math.ceil(remainingMs / 60000);
                return NextResponse.json(
                    {
                        error: `Account temporarily locked. Try again in ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}.`,
                        locked: true,
                        lockedUntil: profile.locked_until
                    },
                    { status: 423 }
                );
            }
        }

        // 3. Attempt sign-in using a temporary non-cookie client, then write cookies manually
        const tempClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        const { data: signInData, error: signInError } = await tempClient.auth.signInWithPassword({
            email,
            password
        });

        if (signInError || !signInData?.session) {
            // Email not confirmed — show friendly message, do NOT count as a failed attempt
            const msg = signInError?.message?.toLowerCase() ?? '';
            if (msg.includes('not confirmed') || msg.includes('email not confirmed')) {
                return NextResponse.json(
                    { error: 'Please verify your email first. Check your inbox for a confirmation link.' },
                    { status: 403 }
                );
            }

            // Provider mismatch — do NOT count as a failed attempt
            const provider = existing.app_metadata?.provider;
            if (provider === 'google') {
                return NextResponse.json(
                    { error: "This account uses Google login. Please use 'Continue with Google' instead." },
                    { status: 401 }
                );
            }
            if (provider === 'phone' || provider === 'phone_otp') {
                return NextResponse.json(
                    { error: "This account uses Phone OTP. Please use 'Continue with Mobile Number' instead." },
                    { status: 401 }
                );
            }

            // Increment failed attempts (provider is 'email' — genuinely wrong password)

            const currentAttempts = (profile?.failed_login_attempts || 0) + 1;
            const updatePayload = { failed_login_attempts: currentAttempts };

            if (currentAttempts >= MAX_ATTEMPTS) {
                const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
                updatePayload.locked_until = lockedUntil;

                await admin
                    .from('user_profiles')
                    .update(updatePayload)
                    .eq('id', existing.id);

                // Audit log account lock
                try {
                    await admin.from('audit_logs').insert({
                        user_id: existing.id,
                        action: 'account_locked',
                        metadata: { email, reason: 'max_failed_attempts' }
                    });
                } catch (e) { /* non-fatal */ }

                return NextResponse.json(
                    { error: `Account locked for ${LOCK_DURATION_MINUTES} minutes due to too many failed attempts.`, locked: true },
                    { status: 423 }
                );
            }

            await admin.from('user_profiles').update(updatePayload).eq('id', existing.id);

            // Audit log failed login
            try {
                await admin.from('audit_logs').insert({
                    user_id: existing.id,
                    action: 'email_login_failed',
                    metadata: { email, attempt: currentAttempts }
                });
            } catch (e) { /* non-fatal */ }

            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        // 4. Success — reset failed attempts
        await admin
            .from('user_profiles')
            .update({ failed_login_attempts: 0, locked_until: null })
            .eq('id', existing.id);

        // 5. Set auth cookie on the response (same pattern as verify-otp route)
        const response = NextResponse.json({
            success: true,
            user: signInData.user
        });

        const cookieServerClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            const isRefreshToken = name.includes('refresh-token');
                            response.cookies.set(name, value, {
                                httpOnly: true,
                                secure: process.env.NODE_ENV === 'production',
                                sameSite: 'lax',
                                path: '/',
                                ...(isRefreshToken ? { maxAge: 60 * 60 * 24 * 365 } : {}),
                                ...options
                            });
                        });
                    }
                }
            }
        );

        await cookieServerClient.auth.setSession(signInData.session);

        // 6. Audit log successful login
        try {
            await admin.from('audit_logs').insert({
                user_id: existing.id,
                action: 'email_login',
                metadata: { email }
            });
        } catch (e) { /* non-fatal */ }

        return response;

    } catch (err) {
        console.error('[SIGNIN] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
