import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { normalizePhone } from '@/lib/phoneUtils';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, phone } = body;
        
        if (!email || !phone) {
            return NextResponse.json({ error: 'Email and phone are required.' }, { status: 400 });
        }

        const { formattedPhone, isValid } = normalizePhone(phone);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 });
        }

        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
        const admin = createAdminClient();

        // Rate limit: 10 checks per 15 minutes per IP
        try {
            const { data: rl, error: rlErr } = await admin.rpc('check_rate_limit', {
                p_key: `checkphone:ip:${ip}`,
                p_max_requests: 10,
                p_window_seconds: 900
            });
            if (rlErr) {
                console.error('[SIGNUP-PRECHECK] Rate limit RPC error:', rlErr.message);
                // fail open
            } else if (rl && !rl.allowed) {
                return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
            }
        } catch (rlEx) {
            console.error('[SIGNUP-PRECHECK] Rate limit check failed:', rlEx.message);
            // fail open
        }

        // Phone uniqueness
        const { data: phoneUserId, error: phoneRpcError } = await admin.rpc('get_user_id_by_phone', { 
            phone_number: formattedPhone 
        });

        if (phoneRpcError) {
            console.error('[SIGNUP-PRECHECK] Phone RPC error:', phoneRpcError.message);
            // Fail open for internal error so client can retry
            return NextResponse.json({ error: 'Internal error' }, { status: 500 });
        }

        if (phoneUserId) {
            return NextResponse.json(
                { error: 'Phone number already registered', code: 'PHONE_EXISTS' },
                { status: 409 }
            );
        }

        // Email uniqueness
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

        // Both available
        return NextResponse.json({ ok: true }, { status: 200 });

    } catch (err) {
        console.error('[SIGNUP-PRECHECK] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
