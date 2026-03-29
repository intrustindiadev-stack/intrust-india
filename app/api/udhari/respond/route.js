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

            // ========== TYPE-SPECIFIC APPROVAL LOGIC ==========
            if (udhariRequest.source_type === 'gift_card') {
                // Verify coupon is still available
                if (udhariRequest.coupon?.status !== 'available') {
                    return NextResponse.json({ error: 'This gift card is no longer available' }, { status: 400 });
                }

                // Reserve the coupon — strict row-count check to handle race conditions.
                const { data: reservedRows, error: couponUpdateError } = await supabaseAdmin
                    .from('coupons')
                    .update({ status: 'reserved' })
                    .eq('id', udhariRequest.coupon_id)
                    .eq('status', 'available')
                    .select('id');

                if (couponUpdateError) {
                    console.error(JSON.stringify({ correlationId, stage: 'coupon_reserve', error: couponUpdateError }));
                    return NextResponse.json({ error: 'Failed to reserve gift card. It may no longer be available.' }, { status: 409 });
                }

                if (!reservedRows || reservedRows.length !== 1) {
                    console.error(JSON.stringify({ correlationId, stage: 'coupon_reserve', error: 'zero_rows_updated', coupon_id: udhariRequest.coupon_id }));
                    return NextResponse.json({ error: 'Gift card was just taken by another request. Please try again.' }, { status: 409 });
                }
            } else if (udhariRequest.source_type === 'shop_order' && udhariRequest.shopping_order_group_id) {
                // 1. Transition the order group to 'pending' (fulfillable)
                const { error: groupUpdateError } = await supabaseAdmin
                    .from('shopping_order_groups')
                    .update({
                        delivery_status: 'pending',
                        payment_method: 'store_credit'
                    })
                    .eq('id', udhariRequest.shopping_order_group_id);

                if (groupUpdateError) {
                    console.error(JSON.stringify({ correlationId, stage: 'order_group_update', error: groupUpdateError }));
                    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
                }

                // 2. Deduct inventory for each item in the order
                const { data: orderItems, error: itemsError } = await supabaseAdmin
                    .from('shopping_order_items')
                    .select('product_id, quantity, inventory_id')
                    .eq('group_id', udhariRequest.shopping_order_group_id);

                if (itemsError) {
                    console.error(JSON.stringify({ correlationId, stage: 'fetch_order_items', error: itemsError }));
                } else if (orderItems && orderItems.length > 0) {
                    // Update stock for each item
                    for (const item of orderItems) {
                        const { error: stockError } = await supabaseAdmin.rpc('decrement_inventory', {
                            p_merchant_id: merchant.id,
                            p_product_id: item.product_id,
                            p_quantity: item.quantity
                        });

                        // If RPC doesn't exist, fallback to manual update (though RPC is safer)
                        if (stockError && stockError.code === 'PGRST116') { // Function not found
                            // Fetch current stock
                            const { data: invData, error: invFetchError } = await supabaseAdmin
                                .from('merchant_inventory')
                                .select('stock_quantity')
                                .eq('id', item.inventory_id)
                                .single();

                            if (invFetchError) {
                                console.error(JSON.stringify({ correlationId, stage: 'inventory_fetch_fallback', error: invFetchError, item }));
                                return NextResponse.json({ error: 'Failed to fetch inventory for item' }, { status: 500 });
                            } else if (invData) {
                                // Update stock
                                const { data: invUpdateData, error: invUpdateError } = await supabaseAdmin
                                    .from('merchant_inventory')
                                    .update({ stock_quantity: invData.stock_quantity - item.quantity })
                                    .eq('id', item.inventory_id)
                                    .gte('stock_quantity', item.quantity) // Prevent going negative
                                    .select('id');

                                if (invUpdateError) {
                                    console.error(JSON.stringify({ correlationId, stage: 'inventory_update_fallback', error: invUpdateError, item }));
                                    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
                                }

                                if (!invUpdateData || invUpdateData.length !== 1) {
                                    console.error(JSON.stringify({ correlationId, stage: 'inventory_update_fallback_insufficient', error: 'zero_rows_updated', item }));
                                    return NextResponse.json({ error: 'Insufficient stock or invalid item.' }, { status: 409 });
                                }
                            } else {
                                return NextResponse.json({ error: 'Inventory not found for item.' }, { status: 404 });
                            }
                        } else if (stockError) {
                            console.error(JSON.stringify({ correlationId, stage: 'inventory_decrement', error: stockError, item }));
                            return NextResponse.json({ error: 'Failed to decrement inventory. Item may be out of stock.' }, { status: 409 });
                        }
                    }
                }
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
                
                // Rollback coupon if it was a gift card
                if (udhariRequest.source_type === 'gift_card') {
                    const { data: rollbackData, error: rollbackError } = await supabaseAdmin
                        .from('coupons')
                        .update({ status: 'available' })
                        .eq('id', udhariRequest.coupon_id)
                        .eq('status', 'reserved')
                        .select('id');
                    
                    if (rollbackError || !rollbackData || rollbackData.length !== 1) {
                        console.error(JSON.stringify({ 
                            correlationId, 
                            stage: 'coupon_rollback_failed', 
                            level: 'HIGH_SEVERITY_INTEGRITY_EVENT',
                            error: rollbackError || 'Rollback row count constraint failed', 
                            udhari_request_id: requestId, 
                            coupon_id: udhariRequest.coupon_id,
                            reverted_count: rollbackData?.length || 0
                        }));
                        return NextResponse.json({ error: 'Failed to approve request. Manual intervention required.' }, { status: 500 });
                    }
                }
                return NextResponse.json({ error: 'Failed to approve request' }, { status: 500 });
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
