import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { generateOTP, hashOTP, validatePhoneNumber, normalizePhone, formatPhoneForSMS } from '@/lib/otpUtils';
import { sendOTP } from '@/lib/smsClient';

export async function POST(request) {
    try {
        const body = await request.json();
        let { phone, flow } = body;

        // Normalize phone using unified utility
        const { cleanPhone, isValid } = normalizePhone(phone);

        // 1. Validate phone number
        if (!isValid) {
            return NextResponse.json(
                { success: false, error: 'Invalid phone number. Must be 10 digits.' },
                { status: 400 }
            );
        }

        phone = cleanPhone; // Set phone to 10-digit clean format for the rest of route

        const supabase = createAdminClient();

        // Retries are handled centrally in supabaseCustomFetch (3 attempts, 4s each, 10s ceiling).
        // Kept as a pass-through so all call sites remain unchanged for easy rollback.
        const executeWithRetry = (queryFn) => queryFn();

        // 1b. Check user existence to prevent account enumeration / spam
        if (flow) {
            const { data: userId, error: checkError } = await executeWithRetry(() =>
                supabase.rpc('get_user_id_by_phone', { phone_number: phone })
            );

            if (checkError) {
                console.error('[send-otp] Database error checking user existence:', checkError);
                return NextResponse.json(
                    { success: false, error: 'Internal server error' },
                    { status: 500 }
                );
            }

            if (flow === 'login' && !userId) {
                console.log(`[send-otp] Login flow: phone ${phone} does not exist. Returning neutral success.`);
                return NextResponse.json({ success: true });
            }

            if (flow === 'signup' && userId) {
                console.log(`[send-otp] Signup flow: phone ${phone} already exists. Returning neutral success.`);
                return NextResponse.json({ success: true });
            }
        }

        // 2. Rate Limiting & Cooldown
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

        // Check recent attempts in last 10 minutes
        const { data: recentOtps, error: countError } = await executeWithRetry(() =>
            supabase
                .from('otp_codes')
                .select('created_at')
                .eq('phone', phone)
                .gt('created_at', tenMinutesAgo.toISOString())
                .order('created_at', { ascending: false })
        );

        if (countError) {
            console.error('Database error checking rate limit:', countError);
            return NextResponse.json(
                { success: false, error: 'Internal server error' },
                { status: 500 }
            );
        }

        // Rate Limit: Max 3 attempts in 10 mins
        if (recentOtps.length >= 3) {
            return NextResponse.json(
                { success: false, error: 'Too many attempts. Please try again later.' },
                { status: 429 }
            );
        }

        // Cooldown: 60 seconds between sends
        if (recentOtps.length > 0) {
            const lastAttempt = new Date(recentOtps[0].created_at);
            const timeDiff = now.getTime() - lastAttempt.getTime();
            if (timeDiff < 60 * 1000) {
                const remaining = Math.ceil((60000 - timeDiff) / 1000);
                return NextResponse.json(
                    { success: false, error: `Please wait ${remaining} seconds before retrying.` },
                    { status: 429 }
                );
            }
        }

        // 3. Generate and Store OTP
        const otp = generateOTP();
        const otpHash = hashOTP(otp);
        // Expires in 5 minutes
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

        const { error: insertError } = await executeWithRetry(() =>
            supabase
                .from('otp_codes')
                .insert({
                    phone,
                    otp_hash: otpHash,
                    expires_at: expiresAt.toISOString(),
                })
        );

        if (insertError) {
            console.error('Database error storing OTP:', insertError);
            return NextResponse.json(
                { success: false, error: 'Failed to generate OTP' },
                { status: 500 }
            );
        }

        // 4. Send SMS
        const msgPhone = formatPhoneForSMS(phone);
        const smsResult = await sendOTP(msgPhone, otp);

        if (!smsResult.success) {
            console.error('SMS sending failed:', smsResult.error);

            // Delete the OTP record we just created so it doesn't count against rate limits
            await executeWithRetry(() =>
                supabase
                    .from('otp_codes')
                    .delete()
                    .eq('phone', phone)
                    .eq('otp_hash', otpHash)
            ).catch((err) => console.error('[send-otp] Failed to delete OTP record after SMS failure:', err));

            return NextResponse.json(
                { success: false, error: smsResult.error || 'Failed to send OTP. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Unexpected error in send-otp:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
