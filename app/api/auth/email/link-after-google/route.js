import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { createServerClient } from '@supabase/ssr';

/**
 * POST /api/auth/email/link-after-google
 *
 * Called by the /link-complete page after the user has completed Google OAuth
 * as part of the "Link Your Accounts" flow (Flow A).
 *
 * At this point the user has already proved Google ownership and has an active
 * session. This route adds a password credential to the authenticated user's
 * Supabase account so they can also sign in with email + password.
 *
 * Body: { password }   (email is read from the current session)
 *
 * Requires: Valid session cookie (user must be logged in via Google).
 */
export async function POST(request) {
    try {
        const { password } = await request.json();

        if (!password || password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters.' },
                { status: 400 }
            );
        }

        // ── Read the current session from cookies ─────────────────────────────────
        const supabaseSession = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() { return request.cookies.getAll(); },
                    setAll() { },   // read-only here — we don't need to write back
                },
            }
        );

        const { data: { user }, error: sessionErr } = await supabaseSession.auth.getUser();

        if (sessionErr || !user) {
            return NextResponse.json(
                { error: 'No active session. Please sign in with Google first.' },
                { status: 401 }
            );
        }

        const admin = createAdminClient();

        // ── Add password to the existing Google user ──────────────────────────────
        const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
            password,
            app_metadata: {
                provider:  'google',
                providers: ['google', 'email'],
            },
        });

        if (updateErr) {
            console.error('[link-after-google] updateUserById error:', updateErr.message);
            return NextResponse.json(
                { error: 'Failed to add email+password to your account. Please try again.' },
                { status: 500 }
            );
        }

        // ── Ensure email identity exists in auth.identities ───────────────────────
        const { error: rpcErr } = await admin.rpc('admin_link_email_identity', {
            target_user_id: user.id,
            target_email: user.email,
        });

        if (rpcErr) {
            console.error('[link-after-google] admin_link_email_identity error:', rpcErr.message);
        }

        // ── Update user_profiles ──────────────────────────────────────────────────
        await admin
            .from('user_profiles')
            .update({ auth_provider: 'multiple' })
            .eq('id', user.id);

        // ── Audit ─────────────────────────────────────────────────────────────────
        try {
            await admin.from('audit_logs').insert({
                user_id:  user.id,
                action:   'account_linked',
                metadata: {
                    method: 'email_password_added_after_google',
                    email:  user.email,
                }
            });
        } catch (_) { /* non-fatal */ }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('[link-after-google] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
