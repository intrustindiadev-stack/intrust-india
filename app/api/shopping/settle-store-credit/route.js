import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * POST /api/shopping/settle-store-credit
 * Body: { udhariRequestId }
 *
 * Settles an approved store-credit request by debiting the customer's wallet,
 * confirming the order group, and recording ledger entries.
 * Calls the Postgres RPC `settle_store_credit_for_cart`.
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

        const body = await request.json();
        const { udhariRequestId } = body;

        if (!udhariRequestId) {
            return NextResponse.json(
                { error: 'Missing required field: udhariRequestId' },
                { status: 400 }
            );
        }

        // Use service role for the atomic RPC (SECURITY DEFINER)
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data, error } = await adminSupabase.rpc('settle_store_credit_for_cart', {
            p_udhari_request_id: udhariRequestId,
            p_customer_user_id: userId,
        });

        if (error) {
            console.error('[settle-store-credit] RPC error:', error);

            // Surface wallet-balance errors to the client
            if (error.message?.includes('insufficient_balance')) {
                return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Notify the merchant
        try {
            // Fetch udhari request details to get merchant_id and payment amount
            const { data: udhari, error: udhariError } = await adminSupabase
                .from('udhari_requests')
                .select('merchant_id, amount_paise')
                .eq('id', udhariRequestId)
                .single();

            if (!udhariError && udhari) {
                // Fetch merchant's user_id
                const { data: merchantData, error: merchantError } = await adminSupabase
                    .from('merchants')
                    .select('user_id')
                    .eq('id', udhari.merchant_id)
                    .single();

                if (!merchantError && merchantData) {
                    // Send notification
                    await adminSupabase.from('notifications').insert({
                        user_id: merchantData.user_id,
                        title: 'Store Credit Payment Received ✅',
                        body: `Payment of ₹${(udhari.amount_paise / 100).toFixed(2)} received for a shop order. The order is ready to fulfill.`,
                        type: 'success',
                        reference_id: udhariRequestId,
                        reference_type: 'udhari_completed'
                    });
                } else {
                    console.error('[settle-store-credit] Missing merchantData or error during notification:', merchantError);
                }
            } else {
                console.error('[settle-store-credit] Missing udhari request or error during notification:', udhariError);
            }
        } catch (notifErr) {
            console.error('[settle-store-credit] Failed to notify merchant:', notifErr);
        }

        return NextResponse.json({
            success: data.success,
            newBalancePaise: data.new_balance_paise,
        });

    } catch (err) {
        console.error('[settle-store-credit] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
