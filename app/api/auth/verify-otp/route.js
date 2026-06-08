import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { hashOTP, validatePhoneNumber, getStablePhoneEmail, isPseudoEmail, normalizePhone } from '@/lib/otpUtils';
import crypto from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { ensureWhatsAppBinding } from '@/lib/whatsapp/ensureBinding';
import { applySupabaseCookies } from '@/lib/supabaseCookieHelper';

export async function POST(request) {
    console.log('[VERIFY-OTP] Request received');
    let claimedOtpId = null;
    let supabaseAdmin = null;

    try {
        const body = await request.json();
        console.log('[VERIFY-OTP] Body:', JSON.stringify(body, null, 2));
        const { phone, otp, full_name } = body;

        // 1. Validate inputs using unified normalizePhone
        const { cleanPhone, isValid } = normalizePhone(phone);

        if (!isValid || !otp || otp.length !== 6) {
            return NextResponse.json(
                { success: false, error: 'Invalid phone number or OTP.', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        supabaseAdmin = createAdminClient();

        // Retries are handled centrally in supabaseCustomFetch (3 attempts, 4s each, 10s ceiling).
        // Kept as a pass-through so all call sites remain unchanged for easy rollback.
        // This also ensures non-idempotent calls (generateLink, verifyOtp) execute exactly once
        // at the route level — only transport-layer retries fire on pre-response connect errors.
        const executeWithRetry = (queryFn) => queryFn();

        // 2. Verify OTP Record
        console.log('[VERIFY-OTP] Looking up OTP for cleanPhone:', cleanPhone);
        const { data: otpRecord, error: fetchError } = await executeWithRetry(() =>
            supabaseAdmin
                .from('otp_codes')
                .select('*')
                .eq('phone', cleanPhone)
                .eq('is_used', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
        );

        if (fetchError || !otpRecord) {
            console.error('[VERIFY-OTP] OTP lookup failed. fetchError:', fetchError, 'cleanPhone:', cleanPhone);
            return NextResponse.json(
                { success: false, error: 'Invalid or expired OTP.', code: 'OTP_NOT_FOUND' },
                { status: 400 }
            );
        }

        const now = new Date();
        const expiresAt = new Date(otpRecord.expires_at);

        if (now > expiresAt) {
            return NextResponse.json(
                { success: false, error: 'OTP has expired.', code: 'OTP_EXPIRED' },
                { status: 400 }
            );
        }

        if (otpRecord.attempts >= otpRecord.max_attempts) {
            return NextResponse.json(
                { success: false, error: 'Too many failed attempts. Please request a new OTP.', code: 'OTP_MAX_ATTEMPTS' },
                { status: 400 }
            );
        }

        const inputHash = hashOTP(otp);
        if (inputHash !== otpRecord.otp_hash) {
            await executeWithRetry(() =>
                supabaseAdmin.from('otp_codes').update({ attempts: otpRecord.attempts + 1 }).eq('id', otpRecord.id)
            );
            return NextResponse.json(
                { success: false, error: 'Invalid OTP.', code: 'OTP_INVALID' },
                { status: 400 }
            );
        }

        // Atomically claim the OTP record
        const { data: claimedRecords, error: claimError } = await executeWithRetry(() =>
            supabaseAdmin
                .from('otp_codes')
                .update({ is_used: true })
                .eq('id', otpRecord.id)
                .eq('is_used', false)
                .select()
        );

        if (claimError || !claimedRecords || claimedRecords.length === 0) {
            console.error('[VERIFY-OTP] Concurrency clash or OTP already claimed:', claimError, claimedRecords);
            return NextResponse.json(
                { success: false, error: 'OTP has already been used or is invalid.', code: 'OTP_ALREADY_USED' },
                { status: 400 }
            );
        }

        // Set claimedOtpId so that catch block knows to roll back on downstream failures
        claimedOtpId = otpRecord.id;

        // 3. User Handling
        const authPhone = `+91${cleanPhone}`;
        let userId = null;

        // Try to get user ID by RPC first
        const { data: rpcUserId, error: rpcError } = await executeWithRetry(() =>
            supabaseAdmin.rpc('get_user_id_by_phone', { phone_number: cleanPhone })
        );
        if (rpcError) {
            console.error('[VERIFY-OTP] get_user_id_by_phone RPC error:', rpcError);
        } else if (rpcUserId) {
            userId = rpcUserId;
        }

        const pseudoEmail = getStablePhoneEmail(cleanPhone);

        if (!userId) {
            // New user path: Create the user
            console.log(`[VERIFY-OTP] Creating new user for phone: ${authPhone}`);
            const { data: newUser, error: createError } = await executeWithRetry(() =>
                supabaseAdmin.auth.admin.createUser({
                    phone: authPhone,
                    email: pseudoEmail,
                    phone_confirm: true,
                    email_confirm: true
                })
            );

            if (createError) {
                // Check if user already exists
                if (createError.message?.toLowerCase().includes('already registered') || createError.status === 422) {
                    console.log('[VERIFY-OTP] User creation collision, falling back to RPC lookup');
                    const { data: fallbackUserId, error: fallbackError } = await executeWithRetry(() =>
                        supabaseAdmin.rpc('get_user_id_by_phone', { phone_number: cleanPhone })
                    );

                    if (!fallbackError && fallbackUserId) {
                        userId = fallbackUserId;
                    } else {
                        const err = new Error('User creation failed: User already registered but could not be resolved.');
                        err.code = 'USER_CREATION_FAILED';
                        throw err;
                    }
                } else {
                    const err = new Error(`User creation failed: ${createError.message}`);
                    err.code = 'USER_CREATION_FAILED';
                    throw err;
                }
            } else {
                userId = newUser.user.id;
            }
        } else {
            // Existing user path: Check if we need to update/confirm details
            console.log(`[VERIFY-OTP] Locating existing user: ${userId}`);
            const { data: userResp, error: getUserError } = await executeWithRetry(() =>
                supabaseAdmin.auth.admin.getUserById(userId)
            );
            if (getUserError || !userResp?.user) {
                const err = new Error(`Could not fetch existing user details: ${getUserError?.message || 'User not found'}`);
                err.code = 'USER_NOT_FOUND';
                throw err;
            }

            const existingUser = userResp.user;
            const needsPhoneConfirm = !existingUser.phone_confirmed_at;
            const needsEmailUpdate = !existingUser.email || (isPseudoEmail(existingUser.email) && existingUser.email !== pseudoEmail);

            if (needsPhoneConfirm || needsEmailUpdate) {
                console.log(`[VERIFY-OTP] Updating user ${userId}: needsPhoneConfirm=${needsPhoneConfirm}, needsEmailUpdate=${needsEmailUpdate}`);
                const updateAttrs = {};
                if (needsPhoneConfirm) {
                    updateAttrs.phone_confirm = true;
                }
                if (needsEmailUpdate) {
                    updateAttrs.email = pseudoEmail;
                    updateAttrs.email_confirm = true;
                }

                const { error: updateError } = await executeWithRetry(() =>
                    supabaseAdmin.auth.admin.updateUserById(userId, updateAttrs)
                );
                if (updateError) {
                    const err = new Error(`Failed to update user login profile: ${updateError.message}`);
                    err.code = 'USER_UPDATE_FAILED';
                    throw err;
                }
            }
        }

        if (!userId) {
            const err = new Error('Could not create or locate user.');
            err.code = 'USER_NOT_FOUND';
            throw err;
        }

        // 4. Update name in user_profiles if provided (both new and existing users)
        if (full_name) {
            console.log(`[VERIFY-OTP] Updating name for user ${userId} to: ${full_name}`);
            const { error: updateProfileError } = await executeWithRetry(() =>
                supabaseAdmin
                    .from('user_profiles')
                    .update({ full_name })
                    .eq('id', userId)
            );

            if (updateProfileError) {
                console.error('[VERIFY-OTP] Failed to update profile name (non-fatal):', updateProfileError);
            }
        }

        // 5. Mint session via generateLink
        console.log(`[VERIFY-OTP] Minting session via generateLink for user ${userId}`);

        const { data: generatedLink, error: genErr } = await executeWithRetry(() =>
            supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: pseudoEmail,
                options: { shouldCreateUser: false },
            })
        );

        if (genErr || !generatedLink?.properties?.hashed_token) {
            console.error('[VERIFY-OTP] generateLink failed:', genErr);
            const err = new Error(genErr?.message || 'Session generation token link failed.');
            err.code = 'SESSION_MINT_FAILED';
            throw err;
        }

        const { data: exchanged, error: exchangeErr } = await executeWithRetry(() =>
            supabaseAdmin.auth.verifyOtp({
                token_hash: generatedLink.properties.hashed_token,
                type: 'magiclink',
            })
        );

        if (exchangeErr || !exchanged?.session) {
            console.error('[VERIFY-OTP] token exchange failed:', exchangeErr);
            const err = new Error(exchangeErr?.message || 'Session exchange token failed.');
            err.code = 'SESSION_MINT_FAILED';
            throw err;
        }

        // Non-blocking: ensure WhatsApp binding is up-to-date for this user.
        ensureWhatsAppBinding({ userId }).catch((e) =>
            console.warn('[VERIFY-OTP] ensureWhatsAppBinding failed (non-fatal):', e.message)
        );

        const session = exchanged.session;
        console.log(`[VERIFY-OTP] Session minted successfully for user ${userId}`);

        // Fetch user profile info (role, suspension status)
        const { data: prof } = await executeWithRetry(() =>
            supabaseAdmin
                .from('user_profiles')
                .select('role, is_suspended')
                .eq('id', userId)
                .single()
        );

        // 5b. Delete the consumed OTP row to prevent unbounded accumulation
        const { error: deleteOtpError } = await supabaseAdmin
            .from('otp_codes')
            .delete()
            .eq('id', claimedOtpId);
        if (deleteOtpError) {
            console.error('[VERIFY-OTP] Non-fatal: failed to delete consumed OTP:', deleteOtpError);
        }
        // Clear claimedOtpId so catch block doesn't attempt rollback on a deleted row
        claimedOtpId = null;

        const response = NextResponse.json({
            success: true,
            user: exchanged.user ?? { id: userId },
            role: prof?.role ?? null,
            is_suspended: prof?.is_suspended ?? false
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
                        applySupabaseCookies(response, cookiesToSet);
                    },
                },
            }
        );

        // Write the session cookies onto the response.
        await cookieServerClient.auth.setSession(session);

        return response;

    } catch (error) {
        console.error('[VERIFY-OTP] Error in verify-otp handler:', error);

        // Rollback OTP claim if it was claimed
        if (claimedOtpId && supabaseAdmin) {
            try {
                console.log(`[VERIFY-OTP] Downstream failure, rolling back OTP claim for ID: ${claimedOtpId}`);
                await supabaseAdmin.from('otp_codes').update({ is_used: false }).eq('id', claimedOtpId);
            } catch (rollbackError) {
                console.error('[VERIFY-OTP] Failed to rollback OTP claim:', rollbackError);
            }
        }

        // Return structured failure response
        const errMessage = error.message || 'An unexpected error occurred';
        const errCode = error.code || 'UNKNOWN_ERROR';
        return NextResponse.json({ success: false, error: errMessage, code: errCode }, { status: 500 });
    }
}
