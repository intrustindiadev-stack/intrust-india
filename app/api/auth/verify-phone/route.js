import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { hashOTP, validatePhoneNumber } from '@/lib/otpUtils';

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

        // 1. Validate inputs
        let cleanPhone = phone ? phone.replace(/\D/g, '') : '';
        if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

        if (!cleanPhone || !validatePhoneNumber(cleanPhone) || !otp || otp.length !== 6) {
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
            .eq('phone', cleanPhone)
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

        if (otpRecord.attempts >= otpRecord.max_attempts) {
            return NextResponse.json(
                { success: false, error: 'Too many failed attempts. Please request a new OTP.' },
                { status: 400 }
            );
        }

        const inputHash = hashOTP(otp);
        if (inputHash !== otpRecord.otp_hash) {
            await supabaseAdmin
                .from('otp_codes')
                .update({ attempts: otpRecord.attempts + 1 })
                .eq('id', otpRecord.id);
            return NextResponse.json(
                { success: false, error: 'Invalid OTP.' },
                { status: 400 }
            );
        }

        // Mark OTP as used
        await supabaseAdmin.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id);

        // 3. Link or verify link status
        const authPhone = `+91${cleanPhone}`;

        // Check who has this phone in auth
        const { data: rpcUserId, error: rpcError } = await supabaseAdmin.rpc('get_user_id_by_phone', { phone_number: cleanPhone });

        if (rpcError) {
            console.error('[VERIFY-PHONE] RPC error:', rpcError);
        }

        // If another account already has this phone linked in auth
        if (rpcUserId && rpcUserId !== userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'This phone number is already registered to a different account. To use this number, please sign in with mobile number instead.',
                    code: 'PHONE_EXISTS_OTHER_ACCOUNT'
                },
                { status: 409 }
            );
        }

        // 4. Update the CURRENT user's phone in auth.users if not already set
        const { data: currentUser } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (currentUser?.user?.phone !== authPhone) {
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                { phone: authPhone, phone_confirm: true }
            );

            if (updateError) {
                console.error('[VERIFY-PHONE] Failed to update auth user phone:', updateError);
                return NextResponse.json(
                    { success: false, error: 'Failed to link phone to account: ' + updateError.message },
                    { status: 500 }
                );
            }
        }

        // 5. Always update user_profiles.phone to ensure consistency
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .update({
                phone: authPhone,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (profileError) {
            console.error('[VERIFY-PHONE] Profile update failed:', profileError);
            // Non-fatal if auth phone is updated, but still worth reporting
        }

        console.log('[VERIFY-PHONE] Phone verified and linked for user:', userId);
        return NextResponse.json({ success: true, phone: authPhone });

    } catch (error) {
        console.error('[VERIFY-PHONE] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: `Internal server error: ${error.message}` },
            { status: 500 }
        );
    }
}
