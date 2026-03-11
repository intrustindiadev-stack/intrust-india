import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const correlationId = crypto.randomUUID();

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

            // Verify coupon is still available
            if (udhariRequest.coupon?.status !== 'available') {
                return NextResponse.json({ error: 'This gift card is no longer available' }, { status: 400 });
            }

            const days = durationDays || udhariRequest.duration_days || 15;
            const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

            // Reserve the coupon
            const { error: couponUpdateError } = await supabaseAdmin
                .from('coupons')
                .update({ status: 'reserved' })
                .eq('id', udhariRequest.coupon_id)
                .eq('status', 'available');

            if (couponUpdateError) {
                console.error(JSON.stringify({ correlationId, stage: 'coupon_reserve', error: couponUpdateError }));
                return NextResponse.json({ error: 'Failed to reserve gift card. It may no longer be available.' }, { status: 409 });
            }

            // Update udhari request
            const { error: updateError } = await supabaseAdmin
                .from('udhari_requests')
                .update({
                    status: 'approved',
                    due_date: dueDate,
                    duration_days: days,
                    disclaimer_accepted: true,
                    merchant_note: merchantNote || null,
                    responded_at: now,
                })
                .eq('id', requestId);

            if (updateError) {
                console.error(JSON.stringify({ correlationId, stage: 'udhari_approve', error: updateError }));
                // Rollback coupon
                await supabaseAdmin.from('coupons').update({ status: 'available' }).eq('id', udhariRequest.coupon_id);
                return NextResponse.json({ error: 'Failed to approve request' }, { status: 500 });
            }

            // Notify customer
            await supabaseAdmin.from('notifications').insert({
                user_id: udhariRequest.customer_id,
                title: 'Store Credit Approved! 🎉',
                body: `Your deferred payment request for "${udhariRequest.coupon?.title || udhariRequest.coupon?.brand}" has been approved. You have ${days} days to pay ₹${(udhariRequest.amount_paise / 100).toFixed(2)}.`,
                type: 'success',
                reference_id: requestId,
                reference_type: 'udhari_approved',
            });

            return NextResponse.json({
                success: true,
                message: `Request approved. Coupon reserved for ${days} days.`,
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

            // Notify customer
            await supabaseAdmin.from('notifications').insert({
                user_id: udhariRequest.customer_id,
                title: 'Store Credit Request Denied',
                body: `Your deferred payment request for "${udhariRequest.coupon?.title || udhariRequest.coupon?.brand}" was denied.${merchantNote ? ` Reason: ${merchantNote}` : ''}`,
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
