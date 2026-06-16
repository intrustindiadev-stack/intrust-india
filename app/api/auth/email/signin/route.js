import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { createServerClient } from '@supabase/ssr';
import { sendWhatsAppLoginAlert } from '@/lib/notifications/authWhatsapp';
import { ensureWhatsAppBinding } from '@/lib/whatsapp/ensureBinding';
import { applySupabaseCookies } from '@/lib/supabaseCookieHelper';
import { isPseudoEmail } from '@/lib/auth';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        // ── B2: Explicit pseudo-email guard ──────────────────────────────────────
        // Reject placeholder emails immediately — before any DB round-trip.
        // Phone-only accounts have pseudo-emails that look real but cannot be used
        // for email+password login.
        if (isPseudoEmail(email)) {
            return NextResponse.json(
                {
                    error: 'This account uses Phone OTP login. Please switch to the Phone tab.',
                    code: 'PSEUDO_EMAIL',
                },
                { status: 400 }
            );
        }

        const admin = createAdminClient();

        // 1. Look up the user ID by email via RPC to avoid >1000 users limitation
        const { data: userId, error: rpcError } = await admin.rpc('get_user_id_by_email', { email_address: email });
        
        if (rpcError) {
            console.error('[SIGNIN] RPC error:', rpcError);
            return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        const { data: userResponse, error: getUserError } = await admin.auth.admin.getUserById(userId);
        
        if (getUserError || !userResponse?.user) {
            console.error('[SIGNIN] getUserById error:', getUserError);
            return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
        }
        
        const existing = userResponse.user;

        if (!existing) {
            // Generic message to prevent email enumeration
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        // 2. Check account lock status and role for JWT metadata
        const { data: profile } = await admin
            .from('user_profiles')
            .select('failed_login_attempts, locked_until, role, is_suspended')
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

        // ── C3: Rate limit (email + IP) ─────────────────────────────────────────
        // Complements the per-account lockout below; protects against credential
        // stuffing across many accounts from a single IP.
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
        try {
            const rlChecks = [
                { key: `email-signin:email:${email.toLowerCase()}`, max: 10, windowSec: 900 },
                { key: `email-signin:ip:${ip}`, max: 50, windowSec: 900 },
            ];
            for (const { key, max, windowSec } of rlChecks) {
                const { data: rl, error: rlErr } = await admin.rpc('check_rate_limit', {
                    p_key: key,
                    p_max_requests: max,
                    p_window_seconds: windowSec,
                });
                if (rlErr) {
                    console.error('[SIGNIN] Rate limit RPC error:', rlErr.message);
                    break; // fail open
                }
                if (rl && !rl.allowed) {
                    return NextResponse.json(
                        {
                            error: 'Too many sign-in attempts. Please wait before trying again.',
                            retryAfter: rl.retry_after ?? 900,
                        },
                        { status: 429 }
                    );
                }
            }
        } catch (rlEx) {
            console.error('[SIGNIN] Rate limit check failed (non-blocking):', rlEx.message);
        }

        // 3. Short-circuit if suspended
        if (profile?.is_suspended) {
            return NextResponse.json({ error: 'Your account has been suspended.', is_suspended: true }, { status: 403 });
        }

        // 4. Pre-populate user_metadata so the JWT minted by signInWithPassword carries these claims
        await admin.auth.admin.updateUserById(existing.id, {
            user_metadata: {
                role: profile?.role ?? null,
                is_suspended: profile?.is_suspended ?? false
            }
        });

        // 5. Attempt sign-in
        const cookiesToSet = [];
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(newCookies) {
                        newCookies.forEach((c) => cookiesToSet.push(c));
                    }
                }
            }
        );

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
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
            const metaProviders = Array.isArray(existing.app_metadata?.providers) ? existing.app_metadata.providers : [];
            const identityProviders = Array.isArray(existing.identities) ? existing.identities.map(i => i.provider) : [];
            const hasEmailIdentity = identityProviders.includes('email');

            if (!hasEmailIdentity && (provider === 'google' || metaProviders.includes('google'))) {
                // Return a structured conflict response so the frontend can show
                // the "Link Your Accounts" UI instead of a plain error.
                return NextResponse.json(
                    { conflict: true, provider: 'google', email: existing.email },
                    { status: 409 }
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

        // 6. Set auth cookie on the response
        const response = NextResponse.json({
            success: true,
            user: signInData.user,
            role: profile?.role ?? null,
            is_suspended: profile?.is_suspended ?? false
        });

        // Replay collected cookies onto the response
        applySupabaseCookies(response, cookiesToSet);

        // 7. Success — reset failed attempts
        await admin
            .from('user_profiles')
            .update({ failed_login_attempts: 0, locked_until: null })
            .eq('id', existing.id);

        // 8. Audit log successful login
        try {
            await admin.from('audit_logs').insert({
                user_id: existing.id,
                action: 'email_login',
                metadata: { email }
            });
        } catch (e) { /* non-fatal */ }

        // 9. WhatsApp login security alert (non-blocking, dedup: 5-min cooldown)
        try {
            const binding = await ensureWhatsAppBinding({ userId: existing.id });
            if (binding?.phone) {
                await sendWhatsAppLoginAlert({
                    userId: existing.id,
                    audience: binding.audience,
                    phone: binding.phone,
                    deviceInfo: request.headers.get('user-agent') || 'Unknown device'
                });
            }
        } catch (waErr) {
            console.error('[signin] WhatsApp login alert failed (non-blocking):', waErr.message);
        }

        return response;

    } catch (err) {
        console.error('[SIGNIN] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
