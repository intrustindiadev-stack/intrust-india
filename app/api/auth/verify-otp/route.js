import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { hashOTP, validatePhoneNumber } from '@/lib/otpUtils';
import crypto from 'crypto';
import { createServerClient } from '@supabase/ssr';

export async function POST(request) {
    console.log('[VERIFY-OTP] Request received');
    try {
        const body = await request.json();
        console.log('[VERIFY-OTP] Body:', JSON.stringify(body, null, 2));
        const { phone, otp, full_name } = body;

        // 1. Validate inputs
        let cleanPhone = phone ? phone.replace(/\D/g, '') : '';
        if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

        if (!cleanPhone || !validatePhoneNumber(cleanPhone) || !otp || otp.length !== 6) {
            return NextResponse.json({ success: false, error: 'Invalid phone number or OTP.' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // 2. Verify OTP Record
        console.log('[VERIFY-OTP] Looking up OTP for cleanPhone:', cleanPhone);
        const { data: otpRecord, error: fetchError } = await supabaseAdmin
            .from('otp_codes')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('is_used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !otpRecord) {
            console.error('[VERIFY-OTP] OTP lookup failed. fetchError:', fetchError, 'cleanPhone:', cleanPhone);
            return NextResponse.json({ success: false, error: 'Invalid or expired OTP.' }, { status: 400 });
        }

        const now = new Date();
        const expiresAt = new Date(otpRecord.expires_at);

        if (now > expiresAt) {
            return NextResponse.json({ success: false, error: 'OTP has expired.' }, { status: 400 });
        }

        if (otpRecord.attempts >= otpRecord.max_attempts) {
            return NextResponse.json({ success: false, error: 'Too many failed attempts. Please request a new OTP.' }, { status: 400 });
        }

        const inputHash = hashOTP(otp);
        if (inputHash !== otpRecord.otp_hash) {
            await supabaseAdmin.from('otp_codes').update({ attempts: otpRecord.attempts + 1 }).eq('id', otpRecord.id);
            return NextResponse.json({ success: false, error: 'Invalid OTP.' }, { status: 400 });
        }

        // Mark OTP as used
        await supabaseAdmin.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);

        // 3. User Handling
        const authPhone = `+91${cleanPhone}`;
        let userId = null;

        // Try to get user ID by RPC first
        const { data: rpcUserId, error: rpcError } = await supabaseAdmin.rpc('get_user_id_by_phone', { phone_number: cleanPhone });
        if (!rpcError && rpcUserId) {
            userId = rpcUserId;
        }

        // If not found, create the user (new-user path only)
        if (!userId) {
            // Generate a strong random password for new-user creation only —
            // it is never used again (login uses admin createSession, not signInWithPassword).
            const newUserPassword = crypto.randomBytes(16).toString('hex') + 'Aa1!';

            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                phone: authPhone,
                password: newUserPassword,
                phone_confirm: true
            });

            if (createError) {
                // Check if user already exists
                if (createError.message?.toLowerCase().includes('already registered') || createError.status === 422) {
                    const { data: fallbackUserId, error: fallbackError } = await supabaseAdmin.rpc('get_user_id_by_phone', { phone_number: cleanPhone });

                    if (!fallbackError && fallbackUserId) {
                        userId = fallbackUserId;
                    } else {
                        return NextResponse.json({ success: false, error: `User creation failed: ${createError.message}` }, { status: 500 });
                    }
                } else {
                    return NextResponse.json({ success: false, error: `User creation failed: ${createError.message}` }, { status: 500 });
                }
            } else {
                userId = newUser.user.id;
                // Update profile name for new users
                if (full_name) {
                    console.log(`[VERIFY-OTP] Updating new user ${userId} with name: ${full_name}`);
                    const { error: updateProfileError } = await supabaseAdmin
                        .from('user_profiles')
                        .update({ full_name })
                        .eq('id', userId);

                    if (updateProfileError) {
                        console.error('[VERIFY-OTP] Failed to update profile name:', updateProfileError);
                    } else {
                        console.log('[VERIFY-OTP] Profile name updated successfully.');
                    }
                }
            }
        }

        if (!userId) {
            return NextResponse.json({ success: false, error: 'Could not create or locate user.' }, { status: 500 });
        }

        // 4. Confirm Phone for existing users (no password rotation)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { phone_confirm: true }
        );

        if (updateError) {
            return NextResponse.json({ success: false, error: 'Failed to confirm user phone.' }, { status: 500 });
        }

        // Update name for existing users if provided
        if (full_name) {
            console.log(`[VERIFY-OTP] Ensuring name update for user ${userId}...`);
            const { error: finalUpdateError } = await supabaseAdmin.from('user_profiles').update({ full_name }).eq('id', userId);
            if (finalUpdateError) console.error('[VERIFY-OTP] Final name update failed:', finalUpdateError);
        }

        // 5. Mint session — createSession was removed in supabase-js v2.60+.
        //    Strategy A: GoTrue admin REST token endpoint (works for phone-only users).
        //    Strategy B: temp-email → generateLink → verifyOtp (fallback for existing-email users).
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        let session = null;

        // Strategy A — GoTrue admin REST token endpoint
        const tokenRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({}),
        });

        if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            session = tokenData;
            console.log('[VERIFY-OTP] Strategy A (admin REST token) succeeded.');
        } else {
            const errBody = await tokenRes.text();
            console.warn(`[VERIFY-OTP] Strategy A failed (${tokenRes.status}): ${errBody}. Falling back to Strategy B.`);

            // Strategy B — assign a temporary email, generateLink, exchange for session
            const tempEmail = `phone-${userId}@intrust.internal`;

            // Set temp email so generateLink can work
            await supabaseAdmin.auth.admin.updateUserById(userId, { email: tempEmail });

            const { data: generatedLink, error: genErr } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: tempEmail,
                options: { shouldCreateUser: false },
            });

            // Clear temp email immediately regardless of outcome
            await supabaseAdmin.auth.admin.updateUserById(userId, { email: null }).catch(() => {});

            if (genErr || !generatedLink?.properties?.hashed_token) {
                console.error('[VERIFY-OTP] Strategy B generateLink failed:', genErr);
                return NextResponse.json({ success: false, error: 'Session creation failed.' }, { status: 500 });
            }

            const { data: exchanged, error: exchangeErr } = await supabaseAdmin.auth.verifyOtp({
                token_hash: generatedLink.properties.hashed_token,
                type: 'magiclink',
            });

            if (exchangeErr || !exchanged?.session) {
                console.error('[VERIFY-OTP] Strategy B token exchange failed:', exchangeErr);
                return NextResponse.json({ success: false, error: 'Session creation failed.' }, { status: 500 });
            }

            session = exchanged.session;
            console.log('[VERIFY-OTP] Strategy B (generateLink exchange) succeeded.');
        }

        if (!session) {
            return NextResponse.json({ success: false, error: 'Session creation failed.' }, { status: 500 });
        }

        console.log('[VERIFY-OTP] Session minted. User:', userId);

        // Build the response object first, then wire a createServerClient to it
        // so Supabase writes sb-*-auth-token cookies directly onto the response.
        const { data: finalUser } = await supabaseAdmin.auth.admin.getUserById(userId);

        const response = NextResponse.json({
            success: true,
            user: finalUser?.user ?? { id: userId }
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
                                ...options,
                            });
                        });
                    },
                },
            }
        );

        // Write the session cookies onto the response.
        await cookieServerClient.auth.setSession(session);

        return response;

    } catch (error) {
        console.error('[VERIFY-OTP] Unexpected error:', error);
        return NextResponse.json({ success: false, error: `Internal server error: ${error.message}` }, { status: 500 });
    }
}
