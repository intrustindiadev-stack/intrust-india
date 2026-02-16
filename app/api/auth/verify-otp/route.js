import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { hashOTP, validatePhoneNumber } from '@/lib/otpUtils';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js'; // Import here instead of require inside

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
        const { data: otpRecord, error: fetchError } = await supabaseAdmin
            .from('otp_codes')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('is_used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !otpRecord) {
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
        const tempPassword = crypto.randomBytes(16).toString('hex') + 'Aa1!';
        let userId = null;

        // Try to get user ID by RPC first
        const { data: rpcUserId, error: rpcError } = await supabaseAdmin.rpc('get_user_id_by_phone', { phone_number: cleanPhone });
        if (!rpcError && rpcUserId) {
            userId = rpcUserId;
        }

        // If not found, try to create or find existing
        if (!userId) {
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                phone: authPhone,
                password: tempPassword,
                phone_confirm: true
            });

            if (createError) {
                // Check if user already exists
                if (createError.message?.toLowerCase().includes('already registered') || createError.status === 422) {
                    const { data: searchData } = await supabaseAdmin.auth.admin.listUsers();
                    const foundUser = searchData?.users?.find(u => u.phone === authPhone || u.phone === cleanPhone);

                    if (foundUser) {
                        userId = foundUser.id;
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

        // 4. Update Credentials & Confirm Phone
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: tempPassword, phone_confirm: true }
        );

        if (updateError) {
            return NextResponse.json({ success: false, error: 'Failed to update user credentials.' }, { status: 500 });
        }

        // Also update name for existing users if provided (and not already done)
        if (full_name) {
            console.log(`[VERIFY-OTP] Ensuring name update for user ${userId}...`);
            const { error: finalUpdateError } = await supabaseAdmin.from('user_profiles').update({ full_name }).eq('id', userId);
            if (finalUpdateError) console.error('[VERIFY-OTP] Final name update failed:', finalUpdateError);
        }

        // 5. Create Session
        const tempClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { data: signInData, error: signInError } = await tempClient.auth.signInWithPassword({
            phone: authPhone,
            password: tempPassword,
        });

        if (signInError || !signInData.session) {
            console.log('[VERIFY-OTP] Sign in failed:', signInError);
            return NextResponse.json({ success: false, error: `Sign in failed: ${signInError.message}` }, { status: 500 });
        }

        console.log('[VERIFY-OTP] Success! User:', userId);
        return NextResponse.json({
            success: true,
            session: signInData.session,
            user: signInData.user
        });

    } catch (error) {
        console.error('[VERIFY-OTP] Unexpected error:', error);
        return NextResponse.json({ success: false, error: `Internal server error: ${error.message}` }, { status: 500 });
    }
}
