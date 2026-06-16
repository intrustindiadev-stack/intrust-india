import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { normalizePhone } from '@/lib/phoneUtils';
import { verifyOTPHash } from '@/lib/otpHmac';

export async function POST(request) {
    let claimedOtpId = null;
    let admin = null;

    try {
        const { email, password, full_name, phone, otp } = await request.json();

        if (!email || !password || !full_name || !phone || !otp) {
            return NextResponse.json({ error: 'Email, password, full name, phone, and OTP are required.' }, { status: 400 });
        }

        const { formattedPhone, isValid, cleanPhone } = normalizePhone(phone);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid phone format.' }, { status: 400 });
        }

        if (otp.length !== 6) {
            return NextResponse.json({ error: 'OTP must be 6 digits.' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        admin = createAdminClient();

        // ── Re-check phone uniqueness ──
        const { data: phoneUserId, error: phoneRpcError } = await admin.rpc('get_user_id_by_phone', { 
            phone_number: formattedPhone 
        });

        if (phoneUserId) {
            return NextResponse.json(
                { error: 'Phone number already registered', code: 'PHONE_EXISTS' },
                { status: 409 }
            );
        }

        // ── Verify OTP ──
        const { data: otpRecord, error: fetchError } = await admin
            .from('otp_codes')
            .select('*')
            .eq('phone', formattedPhone)
            .eq('is_used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !otpRecord) {
            return NextResponse.json({ error: 'Invalid or expired OTP.', code: 'OTP_NOT_FOUND' }, { status: 400 });
        }

        const now = new Date();
        const expiresAt = new Date(otpRecord.expires_at);

        if (now > expiresAt) {
            return NextResponse.json({ error: 'OTP has expired.', code: 'OTP_EXPIRED' }, { status: 400 });
        }

        if (otpRecord.attempts >= (otpRecord.max_attempts || 3)) {
            return NextResponse.json({ error: 'Too many failed attempts. Please request a new OTP.', code: 'OTP_MAX_ATTEMPTS' }, { status: 400 });
        }

        const isValidHash = verifyOTPHash(otp, otpRecord.otp_hash, otpRecord.pepper_hash);
        if (!isValidHash) {
            await admin.from('otp_codes').update({ attempts: otpRecord.attempts + 1 }).eq('id', otpRecord.id);
            return NextResponse.json({ error: 'Invalid OTP.', code: 'OTP_INVALID' }, { status: 400 });
        }

        // Claim OTP
        const { data: claimedRecords, error: claimError } = await admin
            .from('otp_codes')
            .update({ is_used: true })
            .eq('id', otpRecord.id)
            .eq('is_used', false)
            .select();

        if (claimError || !claimedRecords || claimedRecords.length === 0) {
            return NextResponse.json({ error: 'OTP has already been used or is invalid.', code: 'OTP_ALREADY_USED' }, { status: 400 });
        }
        claimedOtpId = otpRecord.id;

        // ── Check if a user with this email already exists via RPC ──
        const { data: existingUserId } = await admin.rpc('get_user_id_by_email', { email_address: email });

        let existing = null;
        if (existingUserId) {
            const { data: userResponse } = await admin.auth.admin.getUserById(existingUserId);
            existing = userResponse?.user;
        }

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

        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = (host.includes('localhost') || host.match(/^[0-9.]+(?::[0-9]+)?$/)) ? 'http' : (request.headers.get('x-forwarded-proto') || 'https');
        const appUrl = (process.env.APP_URL || `${protocol}://${host}`).trim();

        const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
            email,
            password,
            options: {
                data: { full_name },
                emailRedirectTo: `${appUrl}/auth/callback`
            }
        });

        if (signUpError) {
            console.error('[SIGNUP] signUp error:', signUpError);
            return NextResponse.json({ error: signUpError.message || 'Failed to create account.' }, { status: 400 });
        }

        const newUserId = signUpData?.user?.id;

        if (newUserId) {
            // Attach phone
            const { error: phoneUpdateError } = await admin.auth.admin.updateUserById(newUserId, {
                phone: formattedPhone,
                phone_confirm: true
            });

            if (phoneUpdateError) {
                console.error('[SIGNUP] Phone update failed, rolling back user:', phoneUpdateError);
                await admin.auth.admin.deleteUser(newUserId);
                return NextResponse.json({ error: 'Failed to link phone. Please try again.', code: 'PHONE_EXISTS' }, { status: 409 });
            }

            // Update user_profiles.phone
            await admin.from('user_profiles').update({
                phone: formattedPhone,
                updated_at: new Date().toISOString()
            }).eq('id', newUserId);

            // Consume OTP completely (delete it)
            if (claimedOtpId) {
                await admin.from('otp_codes').delete().eq('id', claimedOtpId);
                claimedOtpId = null;
            }

            // Audit log (non-fatal)
            try {
                await admin.from('audit_logs').insert({
                    user_id: newUserId,
                    action: 'email_signup',
                    metadata: { 
                        email, 
                        full_name,
                        phone: `+91******${cleanPhone.slice(-4)}`
                    }
                });
            } catch (auditErr) {
                console.warn('[SIGNUP] Audit log failed (non-fatal):', auditErr);
            }
        }

        return NextResponse.json({ success: true, pendingVerification: true });

    } catch (err) {
        console.error('[SIGNUP] Unexpected error:', err);
        // Rollback claimed OTP if it wasn't deleted
        if (claimedOtpId && admin) {
            try { await admin.from('otp_codes').update({ is_used: false }).eq('id', claimedOtpId); } catch (e) {}
        }
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
