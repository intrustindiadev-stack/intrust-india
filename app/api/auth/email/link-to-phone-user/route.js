/**
 * POST /api/auth/email/link-to-phone-user
 *
 * Role-agnostic route that lets an authenticated user (any role) attach a
 * real email address + password to their account — primarily for phone-only
 * customers who only have a pseudo-email placeholder.
 *
 * Steps:
 *  1. Resolve caller via session cookie → 401 if no session
 *  2. Validate input (email format, password ≥ 8, confirm match) → 400
 *  3. Rate-limit per user (5 attempts / hour) → 429
 *  4. Uniqueness check — 409 if another account already owns this email
 *  5. updateUserById(email, password, email_confirm: true)
 *  6. admin_link_email_identity RPC → upsert email identity row
 *  7. user_profiles.auth_provider = 'multiple'
 *  8. Audit log (account_linked)
 *  9. Return { success: true, email }
 */

import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { logAuthEvent } from '@/lib/authHelpers';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SEC = 3600; // 1 hour

export async function POST(request) {
    const supabaseAdmin = createAdminClient();

    // ── 1. Resolve authenticated caller ─────────────────────────────────────
    let caller;
    try {
        const serverClient = await createServerSupabaseClient();
        const { data: { user }, error: sessionError } = await serverClient.auth.getUser();
        if (sessionError || !user) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }
        caller = user;
    } catch (err) {
        console.error('[link-to-phone-user] Session resolution error:', err);
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const userAgent = request.headers.get('user-agent') ?? null;

    // ── 2. Parse & validate input ────────────────────────────────────────────
    let email, password, confirmPassword;
    try {
        ({ email, password, confirmPassword } = await request.json());
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }
    if (!password || password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (password !== confirmPassword) {
        return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── 3. Rate limit ────────────────────────────────────────────────────────
    try {
        const { data: rlResult, error: rlError } = await supabaseAdmin.rpc('check_rate_limit', {
            p_key: `link-email:${caller.id}`,
            p_max_requests: RATE_LIMIT_MAX,
            p_window_seconds: RATE_LIMIT_WINDOW_SEC,
        });

        if (rlError) {
            console.error('[link-to-phone-user] Rate limit RPC error:', rlError.message);
            // Fail open — do not block on rate-limit RPC errors
        } else if (rlResult && !rlResult.allowed) {
            return NextResponse.json(
                { error: 'Too many attempts. Please wait before trying again.', retryAfter: rlResult.retry_after },
                { status: 429 }
            );
        }
    } catch (err) {
        console.error('[link-to-phone-user] Rate limit check failed (non-blocking):', err.message);
    }

    // ── 4. Uniqueness check ───────────────────────────────────────────────────
    // We cannot query auth.users via PostgREST, so we use listUsers.
    // For a growing user base, this is acceptable (same pattern as signin route).
    try {
        const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
        });

        if (listError) {
            console.error('[link-to-phone-user] listUsers error:', listError);
            return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
        }

        const existing = userList?.users?.find(
            (u) => u.email?.toLowerCase() === normalizedEmail
        );

        if (existing && existing.id !== caller.id) {
            // Email is owned by a different account → conflict
            return NextResponse.json(
                { error: 'That email is already in use by another account.' },
                { status: 409 }
            );
        }

        // If existing.id === caller.id: user already owns this email
        // (e.g. Google-linked with same email). We proceed — just updating
        // the password without changing the email field.
    } catch (err) {
        console.error('[link-to-phone-user] Uniqueness check error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }

    // ── 5. Update auth user (email + password, mark email confirmed) ─────────
    try {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            caller.id,
            {
                email: normalizedEmail,
                password,
                email_confirm: true,
            }
        );

        if (updateError) {
            console.error('[link-to-phone-user] updateUserById error:', updateError.message);

            // Supabase may return 422 if the email is already taken at the DB level
            if (updateError.message?.toLowerCase().includes('already been registered')) {
                return NextResponse.json(
                    { error: 'That email is already in use by another account.' },
                    { status: 409 }
                );
            }

            return NextResponse.json(
                { error: 'Failed to link email. Please try again.' },
                { status: 500 }
            );
        }
    } catch (err) {
        console.error('[link-to-phone-user] updateUserById exception:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }

    // ── 6. Upsert email identity row in auth.identities ──────────────────────
    try {
        const { error: rpcErr } = await supabaseAdmin.rpc('admin_link_email_identity', {
            target_user_id: caller.id,
            target_email: normalizedEmail,
        });

        if (rpcErr) {
            // Non-fatal — the identity row missing won't prevent email login
            // because updateUserById already registered the email in auth.users.
            console.error('[link-to-phone-user] admin_link_email_identity error (non-fatal):', rpcErr.message);
        }
    } catch (err) {
        console.error('[link-to-phone-user] admin_link_email_identity exception (non-fatal):', err.message);
    }

    // ── 7. Update user_profiles.auth_provider ────────────────────────────────
    try {
        await supabaseAdmin
            .from('user_profiles')
            .update({ auth_provider: 'multiple' })
            .eq('id', caller.id);
    } catch (err) {
        // Non-fatal — profile update failure should not block the success response
        console.error('[link-to-phone-user] auth_provider update failed (non-fatal):', err.message);
    }

    // ── 8. Audit log ─────────────────────────────────────────────────────────
    try {
        await logAuthEvent({
            supabaseAdmin,
            action: 'account_linked',
            actorId: caller.id,
            ip,
            userAgent,
            metadata: {
                linked_provider: 'email',
                email: normalizedEmail,
            },
        });
    } catch (err) {
        // Non-fatal
        console.error('[link-to-phone-user] Audit log failed (non-fatal):', err.message);
    }

    // ── 9. Success ────────────────────────────────────────────────────────────
    return NextResponse.json({ success: true, email: normalizedEmail });
}
