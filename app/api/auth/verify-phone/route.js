import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { normalizePhone } from '@/lib/otpUtils';
import { verifyOTPHash } from '@/lib/otpHmac';
import { ensureWhatsAppBinding } from '@/lib/whatsapp/ensureBinding';
import { authError } from '@/lib/authHelpers';

/**
 * Profile Phone Verification API
 * Unlike /api/auth/verify-otp (which creates sessions for login/signup),
 * this route ONLY verifies the OTP and updates the CURRENT user's phone.
 * It does NOT create new users or new sessions.
 */
export async function POST(request) {
    console.log('[VERIFY-PHONE] Request received');
    try {
        const body = await request.json();
        const { phone, otp, userId } = body;

        // 1. Validate inputs using unified normalizePhone
        const { cleanPhone, formattedPhone, isValid } = normalizePhone(phone);

        if (!isValid || !otp || otp.length !== 6) {
            return NextResponse.json(
                { success: false, error: 'Invalid phone number or OTP.' },
                { status: 400 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID is required.' },
                { status: 400 }
            );
        }

        const supabaseAdmin = createAdminClient();

        // 2. Verify OTP against otp_codes table
        const { data: otpRecord, error: fetchError } = await supabaseAdmin
            .from('otp_codes')
            .select('*')
            .eq('phone', formattedPhone)
            .eq('is_used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !otpRecord) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired OTP.' },
                { status: 400 }
            );
        }

        const now = new Date();
        const expiresAt = new Date(otpRecord.expires_at);

        if (now > expiresAt) {
            return NextResponse.json(
                { success: false, error: 'OTP has expired.' },
                { status: 400 }
            );
        }

        if (otpRecord.attempts >= (otpRecord.max_attempts || 3)) {
            return NextResponse.json(
                { success: false, error: 'Too many failed attempts. Please request a new OTP.' },
                { status: 400 }
            );
        }

        const isValidOTP = verifyOTPHash(otp, otpRecord.otp_hash, otpRecord.pepper_hash);
        if (!isValidOTP) {
            await supabaseAdmin
                .from('otp_codes')
                .update({ attempts: otpRecord.attempts + 1 })
                .eq('id', otpRecord.id);
            return NextResponse.json(
                { success: false, error: 'Invalid OTP.' },
                { status: 400 }
            );
        }

        // NOTE: OTP is intentionally NOT marked used here yet.
        // We defer consumption until after the phone update succeeds so that
        // transient downstream failures do not force an unnecessary resend cycle.

        // 3. Link or verify link status
        // Check who has this phone in auth
        const { data: rpcUserId, error: rpcError } = await supabaseAdmin.rpc('get_user_id_by_phone', { phone_number: formattedPhone });

        if (rpcError) {
            console.error('[VERIFY-PHONE] RPC error:', rpcError);
        }

        // If another account already has this phone linked in auth
        if (rpcUserId && rpcUserId !== userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'This phone number is already registered to a different account. To use this number, please sign in with this mobile number instead.',
                    code: 'PHONE_EXISTS_OTHER_ACCOUNT'
                },
                { status: 409 }
            );
        }

        // 4. Update the CURRENT user's phone in auth.users if not already set
        const { data: currentUser } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (currentUser?.user?.phone !== formattedPhone) {
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                { phone: formattedPhone, phone_confirm: true }
            );

            if (updateError) {
                return NextResponse.json(
                    authError('Failed to link phone to account.', updateError.message, 'UPDATE_FAILED', 500)
                );
            }
        }

        // 5. Always update user_profiles.phone to ensure consistency
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .update({
                phone: formattedPhone,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (profileError) {
            console.error('[VERIFY-PHONE] Profile update failed:', profileError);
            // Non-fatal if auth phone is updated, but still worth reporting
        }

        // All downstream steps completed — now it is safe to consume the OTP.
        // Any failure before this point left the OTP intact so the user can retry.
        await supabaseAdmin.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);

        // Non-blocking: ensure WhatsApp binding is up-to-date for this user.
        ensureWhatsAppBinding({ userId }).catch((e) =>
            console.warn('[VERIFY-PHONE] ensureWhatsAppBinding failed (non-fatal):', e.message)
        );

        console.log('[VERIFY-PHONE] Phone verified and linked for user:', userId);
        return NextResponse.json({ success: true, phone: formattedPhone });

    } catch (error) {
        return NextResponse.json(
            authError('Internal server error', error.message, 'INTERNAL_ERROR', 500)
        );
    }
}
