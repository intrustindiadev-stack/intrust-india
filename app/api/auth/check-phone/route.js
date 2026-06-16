import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { normalizePhone } from '@/lib/phoneUtils';

export async function POST(request) {
    try {
        const body = await request.json();
        const { phone } = body;
        
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
                console.error('[CHECK-PHONE] Rate limit RPC error:', rlErr.message);
                // fail open
            } else if (rl && !rl.allowed) {
                return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
            }
        } catch (rlEx) {
            console.error('[CHECK-PHONE] Rate limit check failed:', rlEx.message);
            // fail open
        }

        const { data: userId, error: rpcError } = await admin.rpc('get_user_id_by_phone', { 
            phone_number: formattedPhone 
        });

        if (rpcError) {
            console.error('[CHECK-PHONE] RPC error:', rpcError.message);
            // Fail open, let client proceed to OTP request
            return NextResponse.json({ error: 'Internal error' }, { status: 500 });
        }

        return NextResponse.json({ exists: !!userId }, { status: 200 });

    } catch (error) {
        console.error('[CHECK-PHONE] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
