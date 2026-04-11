import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const { email, password, full_name } = await request.json();

        if (!email || !password || !full_name) {
            return NextResponse.json({ error: 'Email, password, and full name are required.' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        const admin = createAdminClient();

        // ── Check if a user with this email already exists ──
        const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({
            page: 1,
            perPage: 1000
        });

        // More targeted: filter by email in the returned list
        const existing = listError ? null : existingUsers?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (existing) {
            const { data: profile } = await admin
                .from('user_profiles')
                .select('auth_provider')
                .eq('id', existing.id)
                .maybeSingle();

            // Fallback to raw_app_meta_data.provider if the profile row isn't ready yet
            // (race condition with the DB trigger that creates the profile)
            let resolvedProvider = profile?.auth_provider;
            if (!resolvedProvider || resolvedProvider === 'unknown') {
                const metaProvider = existing.app_metadata?.provider;
                if (metaProvider === 'google') resolvedProvider = 'google';
                else if (metaProvider === 'phone' || metaProvider === 'phone_otp') resolvedProvider = 'phone_otp';
                else if (metaProvider === 'email') resolvedProvider = 'email';
            }

            return NextResponse.json(
                {
                    conflict: true,
                    provider: resolvedProvider || 'unknown',
                    message: 'An account with this email already exists.'
                },
                { status: 409 }
            );
        }

        // ── Create user via anon client so Supabase sends the verification email ──
        // Using admin.createUser skips the email flow; signUp triggers it correctly.
        const anonClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );

        const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
            email,
            password,
            options: {
                data: { full_name },
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
            }
        });

        if (signUpError) {
            console.error('[SIGNUP] signUp error:', signUpError);
            return NextResponse.json({ error: signUpError.message || 'Failed to create account.' }, { status: 400 });
        }

        // Audit log (non-fatal)
        if (signUpData?.user) {
            try {
                await admin.from('audit_logs').insert({
                    user_id: signUpData.user.id,
                    action: 'email_signup',
                    metadata: { email, full_name }
                });
            } catch (auditErr) {
                console.warn('[SIGNUP] Audit log failed (non-fatal):', auditErr);
            }
        }

        return NextResponse.json({ success: true, pendingVerification: true });

    } catch (err) {
        console.error('[SIGNUP] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
