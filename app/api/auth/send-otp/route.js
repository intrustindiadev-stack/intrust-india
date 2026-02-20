import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { generateOTP, hashOTP, validatePhoneNumber } from '@/lib/otpUtils';
import { sendOTP } from '@/lib/smsClient';

export async function POST(request) {
    try {
        const body = await request.json();
        let { phone } = body;

        // Normalize phone: Remove non-digits, take last 10 digits
        // This handles +91, 91, 0 prefixes, or spaces/dashes
        if (phone) {
            const digits = phone.replace(/\D/g, '');
            if (digits.length >= 10) {
                phone = digits.slice(-10);
            } else {
                // Too short? leave as is to fail validation below
                phone = digits;
            }
        }

        // 1. Validate phone number
        if (!phone || !validatePhoneNumber(phone)) {
            return NextResponse.json(
                { success: false, error: 'Invalid phone number. Must be 10 digits.' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // 2. Rate Limiting & Cooldown
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

        // Check recent attempts in last 10 minutes
        const { data: recentOtps, error: countError } = await supabase
            .from('otp_codes')
            .select('created_at')
            .eq('phone', phone)
            .gt('created_at', tenMinutesAgo.toISOString())
            .order('created_at', { ascending: false });

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

        const { error: insertError } = await supabase
            .from('otp_codes')
            .insert({
                phone,
                otp_hash: otpHash,
                expires_at: expiresAt.toISOString(),
            });

        if (insertError) {
            console.error('Database error storing OTP:', insertError);
            return NextResponse.json(
                { success: false, error: 'Failed to generate OTP' },
                { status: 500 }
            );
        }

        // 4. Send SMS
        // We ensure we send mostly normalized number to SMS client, 
        // SMS provider might want 91 prefixed. smsClient handles raw phone.
        // Let's prepend 91 for SMS delivery to be safe as most gateways expect country code.
        const msgPhone = `91${phone}`;
        const smsResult = await sendOTP(msgPhone, otp);

        if (!smsResult.success) {
            console.error('SMS sending failed:', smsResult.error);
            // Optional: Delete the OTP record we just created so user isn't penalized?
            // For security (user enumeration), we might still want to return success, 
            // but if the system is broken, the user needs to know.
            // The prompt says "SMS failures are logged but return success".
            // I will follow the prompt but I'll add a specific log.
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
