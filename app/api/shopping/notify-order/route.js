import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { notifyMerchantNewOrder } from '@/lib/notifications/merchantWhatsapp';
import { fireAndForgetEmail } from '@/lib/email/dispatch';
import { sendCustomerOrderEmail, sendAdminAlert, sendMerchantAlert } from '@/lib/email';

export async function POST(request) {
    try {
        const body = await request.json();
        const { group_id, amount_paise } = body;

        if (!group_id || !amount_paise) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const admin = createAdminClient();

        // ── Auth: two-path strategy ───────────────────────────────────────────
        // Path 1: Internal token (server-to-server, e.g. wallet-checkout)
        // Path 2: User JWT (standard browser session)
        const internalToken = request.headers.get('X-Internal-Token');
        const isInternal = internalToken
            && process.env.INTERNAL_API_TOKEN
            && internalToken === process.env.INTERNAL_API_TOKEN;

        let customerId;

        if (isInternal) {
            // INTERNAL PATH: look up order group by group_id only — no user filter
            const { data: orderGroup, error: orderError } = await admin
                .from('shopping_order_groups')
                .select('id, status, customer_id')
                .eq('id', group_id)
                .eq('status', 'completed')
                .single();

            if (orderError || !orderGroup || !orderGroup.customer_id) {
                console.error('[Notify Order] Internal path: order validation failed:', orderError?.message || 'Order not found or not completed');
                return NextResponse.json({ success: true }); // silent fail, do not send notification
            }
            customerId = orderGroup.customer_id;
        } else {
            // USER PATH: standard JWT auth
            const supabase = await createServerSupabaseClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            // Security check: ensure order group exists, belongs to user, and is completed
            const { data: orderGroup, error: orderError } = await admin
                .from('shopping_order_groups')
                .select('id, status, customer_id')
                .eq('id', group_id)
                .eq('customer_id', user.id)
                .eq('status', 'completed')
                .single();

            if (orderError || !orderGroup) {
                console.error('[Notify Order] Order validation failed:', orderError?.message || 'Order not found or not completed');
                // Do not reveal too much info if possible, but still allow tracking
                return NextResponse.json({ success: true }); // Return true to avoid client errors, but we don't send notification
            }
            customerId = user.id;
        }

        const formattedAmount = (amount_paise / 100).toFixed(2);

        // Insert Customer Notification
        const { error: notifyError } = await admin.from('notifications').insert({
            user_id: customerId,
            title: 'Order Placed Successfully ✅',
            body: `Your order of ₹${formattedAmount} has been confirmed.`,
            type: 'success',
            reference_id: group_id,
            reference_type: 'shopping_order'
        });

        if (notifyError) {
            console.error('[Notify Order] Failed to insert notification:', notifyError.message);
        }

        // Notify all admins of the new order
        const { data: adminProfiles } = await admin
            .from('user_profiles')
            .select('id')
            .eq('role', 'admin');

        if (adminProfiles && adminProfiles.length > 0) {
            const adminNotifs = adminProfiles.map((ap) => ({
                user_id: ap.id,
                title: 'New Platform Order 🛍️',
                body: `A new shopping order of ₹${formattedAmount} has been placed (ID: ${group_id.slice(0, 8).toUpperCase()}).`,
                type: 'info',
                reference_id: group_id,
                reference_type: 'shopping_order'
            }));

            const { error: adminNotifyErr } = await admin.from('notifications').insert(adminNotifs);
            if (adminNotifyErr) {
                console.error('[Notify Order] Failed to notify admins:', adminNotifyErr.message);
            }
        }

        // Notify Merchants involved in this order
        const { data: orderItems, error: orderItemsError } = await admin
            .from('shopping_order_items')
            .select('seller_id')
            .eq('group_id', group_id)
            .not('seller_id', 'is', null);

        let orderMerchants = [];

        if (!orderItemsError && orderItems && orderItems.length > 0) {
            const merchantIds = [...new Set(orderItems.map(i => i.seller_id))];
            
            const { data: merchants } = await admin
                .from('merchants')
                .select('id, user_id, business_name, business_email')
                .in('id', merchantIds);

            orderMerchants = merchants || [];

            if (orderMerchants.length > 0) {
                const merchantNotifs = orderMerchants.map(m => ({
                    user_id: m.user_id,
                    title: 'New Order Received 🛒',
                    body: `A customer placed an order (ID: ${group_id.slice(0, 8).toUpperCase()}). Check your orders page.`,
                    type: 'success',
                    reference_id: group_id,
                    reference_type: 'shopping_order'
                }));

                const { error: merchantNotifyErr } = await admin.from('notifications').insert(merchantNotifs);
                if (merchantNotifyErr) {
                    console.error('[Notify Order] Failed to notify merchants:', merchantNotifyErr.message);
                }

                // Best-effort WhatsApp notification (Fire-and-forget)
                try {
                    orderMerchants.forEach(m => {
                        const itemCount = orderItems.filter(i => i.seller_id === m.id).length;
                        notifyMerchantNewOrder({
                            merchantUserId: m.user_id,
                            orderShortId: group_id.slice(0, 8).toUpperCase(),
                            amountRs: formattedAmount,
                            itemCount
                        });
                    });
                } catch (e) {
                    console.error('[Notify Order] WhatsApp dispatch failed:', e);
                }
            }
        }

        // Fire-and-forget emails: Customer confirmation, Admin alert, and Merchant alerts
        fireAndForgetEmail(async () => {
            // 1. Fetch customer details
            const { data: customerProfile } = await admin
                .from('user_profiles')
                .select('email, full_name')
                .eq('id', customerId)
                .maybeSingle();

            const customerEmail = customerProfile?.email;
            const customerName = customerProfile?.full_name || 'Valued Customer';

            // Send Customer Order Confirmation Email
            if (customerEmail) {
                await sendCustomerOrderEmail({
                    type: 'order_confirmed',
                    to: customerEmail,
                    data: {
                        customerName,
                        orderId: group_id,
                        orderTotalRs: formattedAmount,
                    },
                    actorId: customerId,
                    metadata: { orderGroupId: group_id },
                });
            }

            // Send Admin Platform Alert
            await sendAdminAlert({
                type: 'new_order',
                data: {
                    orderShortId: group_id.slice(0, 8).toUpperCase(),
                    amountRs: formattedAmount,
                    customerName,
                },
                actorId: customerId,
                metadata: { orderGroupId: group_id },
            });

            // Send Merchant Alerts
            if (orderMerchants && orderMerchants.length > 0) {
                for (const m of orderMerchants) {
                    let mEmail = m.business_email;
                    if (!mEmail && m.user_id) {
                        const { data: mProf } = await admin
                            .from('user_profiles')
                            .select('email')
                            .eq('id', m.user_id)
                            .maybeSingle();
                        mEmail = mProf?.email;
                    }
                    if (mEmail) {
                        const itemCount = (orderItems || []).filter(i => i.seller_id === m.id).length;
                        await sendMerchantAlert({
                            type: 'new_order',
                            to: mEmail,
                            data: {
                                businessName: m.business_name || 'Valued Merchant',
                                orderShortId: group_id.slice(0, 8).toUpperCase(),
                                amountRs: formattedAmount,
                                itemCount,
                            },
                            actorId: customerId,
                            metadata: { orderGroupId: group_id, merchantId: m.id },
                        });
                    }
                }
            }
        }, { category: 'shopping_order', entityId: group_id });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Notify Order] Server Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
