import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

const MAX_RESENDS_PER_WINDOW = 3;
const WINDOW_MINUTES = 10;

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        const admin = createAdminClient();

        // Find user by email (efficient enough for current scale)
        const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const user = existingUsers?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (!user) {
            // Return success anyway to prevent email enumeration
            return NextResponse.json({ success: true });
        }

        // Skip if email is already verified
        if (user.email_confirmed_at) {
            return NextResponse.json({
                success: false,
                error: 'This email is already verified. Please log in.'
            }, { status: 400 });
        }

        // ── Rate limit: check recent resends in auth_tokens ──────────────────────
        const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
        const { data: recentTokens } = await admin
            .from('auth_tokens')
            .select('id')
            .eq('user_id', user.id)
            .eq('token_type', 'email_verification')
            .gte('created_at', windowStart);

        if (recentTokens && recentTokens.length >= MAX_RESENDS_PER_WINDOW) {
            return NextResponse.json(
                { error: `Too many verification emails. Please wait ${WINDOW_MINUTES} minutes before trying again.` },
                { status: 429 }
            );
        }

        // ── Resend verification email via anon client ─────────────────────────────
        // admin.auth.admin.generateLink generates the link but does NOT send the email.
        // supabase.auth.resend() actually sends it.
        const anonClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );

        const { error: resendError } = await anonClient.auth.resend({
            type: 'signup',
            email,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
            }
        });

        if (resendError) {
            console.error('[RESEND-VERIFICATION] resend error:', resendError);
            return NextResponse.json({ error: 'Failed to resend verification email.' }, { status: 500 });
        }

        // ── Track this resend attempt for rate limiting ───────────────────────────
        try {
            await admin.from('auth_tokens').insert({
                user_id: user.id,
                email,
                token_type: 'email_verification',
                sent_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
            });
        } catch (e) {
            console.warn('[RESEND-VERIFICATION] auth_token insert failed (non-fatal):', e);
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('[RESEND-VERIFICATION] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
