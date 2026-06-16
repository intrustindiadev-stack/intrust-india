import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { generateOTP, normalizePhone, hashOTP } from '@/lib/otpUtils';
import { hmacOTP } from '@/lib/otpHmac';
import { sendOTP } from '@/lib/smsClient';
import { checkLayeredRateLimit } from '@/lib/sharedRateLimit';
import { authError, logAuthEvent } from '@/lib/authHelpers';

export async function POST(request) {
    try {
        const body = await request.json();
        let { phone } = body;

        const { cleanPhone, formattedPhone, isValid } = normalizePhone(phone);
        if (!isValid) {
            return authError('Invalid phone number. Must be 10 digits.', 'Invalid phone format', 'INVALID_INPUT', 400);
        }

        const supabaseAdmin = createAdminClient();
        const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
        const userAgent = request.headers.get('user-agent');

        const { allowed, reason, retryAfter, consumedKeys } = await checkLayeredRateLimit({
            supabaseAdmin,
            phone: formattedPhone,
            ip
        });

        if (!allowed) {
            await logAuthEvent({
                supabaseAdmin,
                action: 'otp_request_blocked',
                ip,
                userAgent,
                metadata: { phone: `+91******${cleanPhone.slice(-4)}`, reason, retry_after: retryAfter }
            });
            // We can pass extra data in the error details or construct a custom response.
            // Since authError takes (message, details, code, status), we might need to modify authError or 
            // construct the NextResponse directly to include retry_after.
            // But let's check what authError returns: It returns a NextResponse.json.
            // Let's just return our own for this specific case to cleanly add retry_after.
            return NextResponse.json(
                { success: false, error: 'For your security, please wait a moment before trying again.', details: reason, code: 'RATE_LIMITED', retry_after: retryAfter },
                { status: 429 }
            );
        }

        const otp = generateOTP();
        const pepperHash = hmacOTP(otp);
        const legacyHash = hashOTP(otp);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const { error: insertError } = await supabaseAdmin
            .from('otp_codes')
            .insert({
                phone: formattedPhone,
                otp_hash: legacyHash,
                pepper_hash: pepperHash,
                expires_at: expiresAt.toISOString(),
            });

        if (insertError) {
            return authError('Failed to generate OTP', insertError.message, 'DB_ERROR', 500);
        }

        const smsResult = await sendOTP(cleanPhone, otp);

        if (!smsResult.success) {
            await logAuthEvent({
                supabaseAdmin,
                action: 'otp_send_failed',
                ip,
                userAgent,
                metadata: { phone: `+91******${cleanPhone.slice(-4)}`, error_message: smsResult.error }
            });

            await supabaseAdmin
                .from('otp_codes')
                .delete()
                .eq('phone', formattedPhone)
                .eq('pepper_hash', pepperHash);

            // Rollback rate limits since the SMS send failed
            if (consumedKeys && consumedKeys.length > 0) {
                for (const key of consumedKeys) {
                    await supabaseAdmin.rpc('rollback_rate_limit', { p_key: key });
                }
            }

            return authError('Failed to send OTP. Please try again.', smsResult.error, 'SMS_FAILED', 500);
        }


        await logAuthEvent({
            supabaseAdmin,
            action: 'otp_requested',
            ip,
            userAgent,
            metadata: { phone: `+91******${cleanPhone.slice(-4)}` }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        return authError('Something went wrong. Please try again.', error.message, 'INTERNAL_ERROR', 500);
    }
}
