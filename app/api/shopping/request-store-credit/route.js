import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * POST /api/shopping/request-store-credit
 * Body: { groupId, merchantId, durationDays }
 *
 * Creates a pending store-credit (Udhari) request tied to a shopping_order_group.
 * Calls the Postgres RPC `request_store_credit_for_cart`.
 */
export async function POST(request) {
    try {
        // 1. Identify User (Safer pattern for API routes)
        let userId = null;

        // Try getting session from headers first (most reliable for our setup)
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const tempSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            const { data: { user } } = await tempSupabase.auth.getUser(token);
            userId = user?.id;
        }

        // Fallback to cookies (Read-only to prevent Next.js "cookies().set() is not allowed" error)
        if (!userId) {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    cookies: {
                        get(name) { return cookieStore.get(name)?.value; },
                        set() { }, // No-op in API routes
                        remove() { }, // No-op in API routes
                    },
                }
            );
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
        }

        // 2. Extract and Validate Input
        const body = await request.json();
        const { groupId, merchantId, durationDays, amountPaise } = body;

        if (!groupId || !merchantId || !durationDays || !amountPaise) {
            return NextResponse.json({
                error: 'Missing required parameters',
                received: {
                    groupId: !!groupId,
                    merchantId: !!merchantId,
                    durationDays: !!durationDays,
                    amountPaise: !!amountPaise
                }
            }, { status: 400 });
        }

        const cleanDuration = parseInt(durationDays, 10);
        const cleanAmount = parseInt(amountPaise, 10);

        if (isNaN(cleanDuration) || isNaN(cleanAmount)) {
            return NextResponse.json({ error: 'Invalid numeric parameters' }, { status: 400 });
        }

        // 3. Call RPC using Admin Client
        console.log(`[request-store-credit] User ${userId} requesting credit for group ${groupId}`);

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data, error: rpcError } = await adminSupabase.rpc('request_store_credit_for_cart', {
            p_customer_id: userId,
            p_group_id: groupId,
            p_merchant_id: merchantId,
            p_amount_paise: cleanAmount,
            p_duration_days: cleanDuration
        });

        if (rpcError) {
            console.error('[request-store-credit] RPC Execution error:', rpcError);
            const msg = rpcError.message || 'Database error occurred';

            let status = 500;
            if (msg.includes('not_found')) status = 404;
            if (msg.includes('permission_denied') || msg.includes('ownership')) status = 403;
            if (msg.includes('invalid_status')) status = 400;

            return NextResponse.json({
                error: msg,
                details: rpcError.details,
                hint: rpcError.hint,
                code: rpcError.code
            }, { status });
        }

        if (!data) {
            return NextResponse.json({ error: 'RPC call failed to return a response' }, { status: 500 });
        }

        // 4. Successful Response
        return NextResponse.json({
            success: data.success,
            message: data.message,
            udhariRequestId: data.udhari_request_id
        });

    } catch (err) {
        console.error('[request-store-credit] Critical error:', err);
        return NextResponse.json({
            error: err.message || 'An unexpected server error occurred',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 });
    }
}

