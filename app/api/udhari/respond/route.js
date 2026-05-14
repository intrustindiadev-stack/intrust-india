import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const correlationId = crypto.randomUUID();

    try {
        const supabaseAdmin = createAdminClient();

        // 1. Auth check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }

        // 2. Verify user is a merchant
        const { data: merchant, error: merchantError } = await supabaseAdmin
            .from('merchants')
            .select('id, user_id, status')
            .eq('user_id', user.id)
            .single();

        if (merchantError || !merchant || merchant.status !== 'approved') {
            return NextResponse.json({ error: 'Unauthorized. Merchant access required.' }, { status: 403 });
        }

        // 3. Parse request body
        const { requestId, action, merchantNote, disclaimerAccepted, durationDays } = await request.json();

        if (!requestId) {
            return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
        }

        if (!['approve', 'deny'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action. Must be "approve" or "deny".' }, { status: 400 });
        }

        // 4. Fetch the udhari request
        const { data: udhariRequest, error: fetchError } = await supabaseAdmin
            .from('udhari_requests')
            .select('*, coupon:coupons(id, title, brand, status, selling_price_paise)')
            .eq('id', requestId)
            .eq('merchant_id', merchant.id)
            .single();

        if (fetchError || !udhariRequest) {
            return NextResponse.json({ error: 'Request not found or does not belong to you' }, { status: 404 });
        }

        if (udhariRequest.status !== 'pending') {
            return NextResponse.json({ error: `This request has already been ${udhariRequest.status}` }, { status: 400 });
        }

        const now = new Date().toISOString();

        // ========== APPROVE ==========
        if (action === 'approve') {
            if (!disclaimerAccepted) {
                return NextResponse.json({
                    error: 'You must accept the risk disclaimer to approve this request.'
                }, { status: 400 });
            }

            const days = durationDays || udhariRequest.duration_days || 15;
            const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

            // Ensure customer has no defaulted udhari requests
            const { count: defaultCount, error: defaultCountError } = await supabaseAdmin
                .from('udhari_requests')
                .select('*', { count: 'exact', head: true })
                .eq('customer_id', udhariRequest.customer_id)
                .eq('status', 'expired');
            
            if (defaultCountError) {
                console.error(JSON.stringify({ correlationId, stage: 'check_defaults', error: defaultCountError }));
                return NextResponse.json({ error: 'Failed to check customer history' }, { status: 500 });
            }

            if (defaultCount > 0) {
                return NextResponse.json({ error: 'This customer has defaulted on previous deferred payments and cannot be approved.' }, { status: 400 });
            }

            // Call the atomic RPC to approve the request
            const { error: rpcError } = await supabaseAdmin.rpc('merchant_approve_udhari_request', {
                p_request_id: requestId,
                p_duration_days: days,
                p_merchant_note: merchantNote || null,
                p_disclaimer_accepted: true
            });

            if (rpcError) {
                console.error(JSON.stringify({ correlationId, stage: 'udhari_approve_rpc', error: rpcError }));
                return NextResponse.json({ error: rpcError.message || 'Failed to approve request' }, { status: 500 });
            }

            // Notify customer
            const itemTitle = udhariRequest.source_type === 'gift_card' 
                ? (udhariRequest.coupon?.title || udhariRequest.coupon?.brand)
                : 'Shop Order';

            await supabaseAdmin.from('notifications').insert({
                user_id: udhariRequest.customer_id,
                title: 'Store Credit Approved! 🎉',
                body: `Your deferred payment request for "${itemTitle}" has been approved. You have ${days} days to pay ₹${(udhariRequest.amount_paise / 100).toFixed(2)}.`,
                type: 'success',
                reference_id: requestId,
                reference_type: 'udhari_approved',
            });

            return NextResponse.json({
                success: true,
                message: `Request approved. ${udhariRequest.source_type === 'gift_card' ? 'Coupon reserved' : 'Order confirmed'} for ${days} days.`,
                dueDate,
            });
        }

        // ========== DENY ==========
        if (action === 'deny') {
            const { error: updateError } = await supabaseAdmin
                .from('udhari_requests')
                .update({
                    status: 'denied',
                    merchant_note: merchantNote || 'Request denied by merchant.',
                    responded_at: now,
                })
                .eq('id', requestId);

            if (updateError) {
                console.error(JSON.stringify({ correlationId, stage: 'udhari_deny', error: updateError }));
                return NextResponse.json({ error: 'Failed to deny request' }, { status: 500 });
            }

            // If it's a shop order, revert the order group back to pending so customer can pick another payment
            if (udhariRequest.source_type === 'shop_order' && udhariRequest.shopping_order_group_id) {
                await supabaseAdmin
                    .from('shopping_order_groups')
                    .update({
                        payment_method: null,
                        delivery_status: 'pending'
                    })
                    .eq('id', udhariRequest.shopping_order_group_id);
            }

            // Notify customer
            const itemTitle = udhariRequest.source_type === 'gift_card' 
                ? (udhariRequest.coupon?.title || udhariRequest.coupon?.brand)
                : 'Shop Order';

            await supabaseAdmin.from('notifications').insert({
                user_id: udhariRequest.customer_id,
                title: 'Store Credit Request Denied',
                body: `Your deferred payment request for "${itemTitle}" was denied.${merchantNote ? ` Reason: ${merchantNote}` : ''}`,
                type: 'warning',
                reference_id: requestId,
                reference_type: 'udhari_denied',
            });

            return NextResponse.json({
                success: true,
                message: 'Request denied successfully.',
            });
        }

    } catch (error) {
        console.error(JSON.stringify({ correlationId, stage: 'unexpected_error', error: error?.message || String(error) }));
        return NextResponse.json({ error: 'An unexpected internal error occurred.', correlationId }, { status: 500 });
    }
}
