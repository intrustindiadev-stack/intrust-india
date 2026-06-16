import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { normalizePhone, getStablePhoneEmail } from '@/lib/otpUtils';
import { verifyOTPHash } from '@/lib/otpHmac';
import { authError, logAuthEvent, retryWithBackoff } from '@/lib/authHelpers';
import { createServerClient } from '@supabase/ssr';
import { applySupabaseCookies } from '@/lib/supabaseCookieHelper';
import { ensureWhatsAppBinding } from '@/lib/whatsapp/ensureBinding';
import { sendWhatsAppLoginAlert } from '@/lib/notifications/authWhatsapp';

export async function POST(request) {
    let claimedOtpId = null;
    let supabaseAdmin = null;

    try {
        const body = await request.json();
        const { phone, otp } = body;

        const { cleanPhone, formattedPhone, isValid } = normalizePhone(phone);

        if (!isValid || !otp || otp.length !== 6) {
            return authError('Invalid phone number or OTP.', 'Invalid input format', 'INVALID_INPUT', 400);
        }

        supabaseAdmin = createAdminClient();
        const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
        const userAgent = request.headers.get('user-agent') || '';
        const metadataBase = { phone: `+91******${cleanPhone.slice(-4)}` };

        const executeWithRetry = (queryFn) => queryFn();

        const { data: otpRecord, error: fetchError } = await executeWithRetry(() =>
            supabaseAdmin
                .from('otp_codes')
                .select('*')
                .eq('phone', formattedPhone)
                .eq('is_used', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
        );

        if (fetchError || !otpRecord) {
            await logAuthEvent({ supabaseAdmin, action: 'otp_verify_failed', ip, userAgent, metadata: { ...metadataBase, reason: 'OTP not found' } });
            return authError('Invalid or expired OTP.', 'OTP not found', 'OTP_NOT_FOUND', 400);
        }

        const now = new Date();
        const expiresAt = new Date(otpRecord.expires_at);

        if (now > expiresAt) {
            await logAuthEvent({ supabaseAdmin, action: 'otp_verify_failed', ip, userAgent, metadata: { ...metadataBase, reason: 'OTP expired' } });
            return authError('OTP has expired.', 'OTP expired', 'OTP_EXPIRED', 400);
        }

        if (otpRecord.attempts >= (otpRecord.max_attempts || 3)) {
            await logAuthEvent({ supabaseAdmin, action: 'otp_verify_failed', ip, userAgent, metadata: { ...metadataBase, reason: 'Max attempts' } });
            return authError('Too many failed attempts. Please request a new OTP.', 'Max attempts reached', 'OTP_MAX_ATTEMPTS', 400);
        }

        const isValidHash = verifyOTPHash(otp, otpRecord.otp_hash, otpRecord.pepper_hash);
        if (!isValidHash) {
            await supabaseAdmin.from('otp_codes').update({ attempts: otpRecord.attempts + 1 }).eq('id', otpRecord.id);
            await logAuthEvent({ supabaseAdmin, action: 'otp_verify_failed', ip, userAgent, metadata: { ...metadataBase, reason: 'Invalid OTP' } });
            
            const attemptsLeft = (otpRecord.max_attempts || 3) - (otpRecord.attempts + 1);
            return authError('Invalid OTP.', 'Invalid OTP', 'OTP_INVALID', 400, { attempts_remaining: Math.max(0, attemptsLeft) });
        }

        // Resolve identity BEFORE claiming OTP
        const { data: userId, error: rpcError } = await executeWithRetry(() =>
            supabaseAdmin.rpc('get_user_id_by_phone', { phone_number: formattedPhone })
        );

        if (rpcError) {
            throw new Error(`RPC error: ${rpcError.message}`);
        }

        if (!userId) {
            await logAuthEvent({ supabaseAdmin, action: 'otp_login_no_account', ip, userAgent, metadata: metadataBase });
            return NextResponse.json({ success: true, outcome: 'no_account' }, { status: 200 });
        }

        // Identity resolved, now claim the OTP
        const { data: claimedRecords, error: claimError } = await executeWithRetry(() =>
            supabaseAdmin
                .from('otp_codes')
                .update({ is_used: true })
                .eq('id', otpRecord.id)
                .eq('is_used', false)
                .select()
        );

        if (claimError || !claimedRecords || claimedRecords.length === 0) {
            await logAuthEvent({ supabaseAdmin, action: 'otp_verify_failed', ip, userAgent, metadata: { ...metadataBase, reason: 'OTP already used' } });
            return authError('OTP has already been used or is invalid.', 'OTP already used', 'OTP_ALREADY_USED', 400);
        }

        claimedOtpId = otpRecord.id;

        const { data: prof } = await executeWithRetry(() =>
            supabaseAdmin
                .from('user_profiles')
                .select('role, is_suspended')
                .eq('id', userId)
                .single()
        );

        const { data: authUserRecord, error: authUserError } = await executeWithRetry(() => supabaseAdmin.auth.admin.getUserById(userId));
        
        if (authUserError || !authUserRecord?.user) {
            return authError('Account has no valid login credentials.', 'Account missing', 'INVALID_ACCOUNT', 400);
        }

        let actualEmail = authUserRecord.user.email;

        // Self-heal: backfill missing email for phone users on the fly (Ticket 5)
        if (!actualEmail) {
            actualEmail = getStablePhoneEmail(cleanPhone);
            const { error: healError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                email: actualEmail,
                email_confirm: true
            });
            if (healError) {
                 return authError('Failed to initialize account credentials.', 'Email self-heal failed', 'INTERNAL_ERROR', 500);
            }
        }

        await supabaseAdmin.auth.admin.updateUserById(userId, { 
            user_metadata: { 
                is_suspended: prof?.is_suspended || false,
                role: prof?.role || null
            } 
        });

        let generatedLink;
        try {
            generatedLink = await retryWithBackoff(async () => {
                const res = await supabaseAdmin.auth.admin.generateLink({
                    type: 'magiclink',
                    email: actualEmail,
                    options: { shouldCreateUser: false },
                });
                if (res.error) throw res.error;
                if (!res.data?.properties?.hashed_token) {
                    throw new Error('Hashed token missing from link generation response');
                }
                return res.data;
            }, 3, 200);
        } catch (genErr) {
            await logAuthEvent({
                supabaseAdmin,
                action: 'session_mint_failed',
                actorId: userId,
                ip,
                userAgent,
                metadata: { ...metadataBase, error_step: 'link_generation', error_message: genErr.message }
            });
            const err = new Error(genErr.message);
            err.code = 'LINK_GENERATION_FAILED';
            err.publicMessage = 'Session generation failed. Please try again.';
            throw err;
        }

        let exchanged;
        try {
            exchanged = await retryWithBackoff(async () => {
                const res = await supabaseAdmin.auth.verifyOtp({
                    token_hash: generatedLink.properties.hashed_token,
                    type: 'magiclink',
                });
                if (res.error) throw res.error;
                if (!res.data?.session) {
                    throw new Error('Session missing from OTP verification response');
                }
                return res.data;
            }, 3, 200);
        } catch (exchangeErr) {
            await logAuthEvent({
                supabaseAdmin,
                action: 'session_mint_failed',
                actorId: userId,
                ip,
                userAgent,
                metadata: { ...metadataBase, error_step: 'token_exchange', error_message: exchangeErr.message }
            });
            const err = new Error(exchangeErr.message);
            err.code = 'TOKEN_EXCHANGE_FAILED';
            err.publicMessage = 'Session exchange failed. Please try again.';
            throw err;
        }

        const session = exchanged.session;

        await logAuthEvent({
            supabaseAdmin,
            action: 'session_mint_success',
            actorId: userId,
            ip,
            userAgent,
            metadata: metadataBase
        });

        await logAuthEvent({ supabaseAdmin, action: 'otp_login_success', actorId: userId, ip, userAgent, metadata: metadataBase });

        // Non-blocking: ensure WhatsApp binding is up-to-date and send login alert for returning user.
        (async () => {
            try {
                const { isNewLink, audience, phone } = await ensureWhatsAppBinding({ userId });
                if (isNewLink === false && phone) {
                    await sendWhatsAppLoginAlert({
                        userId,
                        audience,
                        phone,
                        deviceInfo: userAgent
                    });
                }
            } catch (e) {
                console.warn('[VERIFY-OTP] WhatsApp binding/alert failed (non-fatal):', e.message);
            }
        })();

        const response = NextResponse.json({
            success: true,
            user: exchanged.user ?? { id: userId },
            role: prof?.role ?? null,
            is_suspended: prof?.is_suspended ?? false
        });

        try {
            const cookieServerClient = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    cookies: {
                        getAll() { return request.cookies.getAll(); },
                        setAll(cookiesToSet) { applySupabaseCookies(response, cookiesToSet); },
                    },
                }
            );

            await cookieServerClient.auth.setSession(session);
        } catch (cookieErr) {
            await logAuthEvent({
                supabaseAdmin,
                action: 'session_mint_failed',
                actorId: userId,
                ip,
                userAgent,
                metadata: { ...metadataBase, error_step: 'cookie_set', error_message: cookieErr.message }
            });
            const err = new Error(cookieErr.message);
            err.code = 'COOKIE_SET_FAILED';
            err.publicMessage = 'Failed to set login session. Please try again.';
            throw err;
        }

        await supabaseAdmin.from('otp_codes').delete().eq('id', claimedOtpId);
        claimedOtpId = null;

        return response;

    } catch (error) {
        console.error('[VERIFY-OTP] Error:', error);
        if (claimedOtpId && supabaseAdmin) {
            try {
                await supabaseAdmin.from('otp_codes').update({ is_used: false }).eq('id', claimedOtpId);
            } catch (e) {}
        }
        const publicMessage = error.publicMessage || 'Something went wrong. Please try again.';
        const publicCode = error.code || 'INTERNAL_ERROR';
        return authError(publicMessage, error.message, publicCode, 500);
    }
}
