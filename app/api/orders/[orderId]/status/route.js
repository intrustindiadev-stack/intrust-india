import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { notifyCustomerOrderStatus } from '@/lib/notifications/userWhatsapp';
import { notifyMerchantTransaction } from '@/lib/notifications/merchantWhatsapp';
import { fireAndForgetEmail } from '@/lib/email/dispatch';
import { sendCustomerOrderEmail } from '@/lib/email';

export async function PATCH(request, { params }) {
    try {
        const { orderId } = await params;
        const body = await request.json();
        const { newStatus, trackingNumber, estimatedAt, statusNotes, isAdmin, isMerchant, isCustomer } = body;

        const supabase = await createServerSupabaseClient();
        
        // 1. Call the RPC using the authenticated client
        const { data: rpcResult, error: rpcError } = await supabase.rpc('update_order_delivery_v3', {
            p_order_id: orderId,
            p_new_status: newStatus,
            p_tracking_number: trackingNumber,
            p_estimated_at: estimatedAt,
            p_status_notes: statusNotes,
            p_is_admin: isAdmin || false,
            p_is_merchant: isMerchant || false,
            p_is_customer: isCustomer || false
        });

        if (rpcError) throw rpcError;
        if (!rpcResult || !rpcResult.success) {
             return NextResponse.json({ success: false, message: rpcResult?.message || 'Update failed' }, { status: 400 });
        }

        // 2. Fetch the customer ID to send the WhatsApp message
        if (['shipped', 'out_for_delivery', 'delivered'].includes(newStatus)) {
            const adminClient = createAdminClient();
            const { data: order } = await adminClient
                .from('shopping_order_groups')
                .select(`
                    customer_id, 
                    merchant_id, 
                    merchant_profit_paise, 
                    settlement_status,
                    merchants (
                        user_id,
                        wallet_balance_paise
                    )
                `)
                .eq('id', orderId)
                .single();
            
            if (order?.customer_id) {
                // Fire and forget WhatsApp notification
                notifyCustomerOrderStatus({ 
                    userId: order.customer_id, 
                    orderId: orderId.substring(0, 8).toUpperCase(), 
                    newStatus: newStatus 
                }).catch(e => console.error('[Order Status API] Customer WhatsApp failed:', e));

                // Fire and forget email notification to customer
                fireAndForgetEmail(async () => {
                    const { data: customerProfile } = await adminClient
                        .from('user_profiles')
                        .select('email')
                        .eq('id', order.customer_id)
                        .maybeSingle();

                    if (customerProfile?.email) {
                        await sendCustomerOrderEmail({
                            type: 'order_status_update',
                            to: customerProfile.email,
                            data: {
                                orderId,
                                newStatus,
                                trackingNumber: trackingNumber || undefined,
                                statusNotes: statusNotes || undefined,
                            },
                            actorId: order.customer_id,
                            metadata: { orderId, newStatus },
                        });
                    }
                }, { category: 'customer_order', entityId: orderId });
            }

            // 3. Fire merchant transaction alert for settlement credit
            // The RPC only settles on the first transition to packed/shipped/delivered.
            // We use the orderId as the dedupe key so the merchant only gets one alert.
            if (order?.merchants?.user_id && order?.merchant_profit_paise > 0) {
                const amountRs = (order.merchant_profit_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                const newBalanceRs = ((order.merchants.wallet_balance_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
                
                notifyMerchantTransaction({
                    merchantUserId: order.merchants.user_id,
                    amountRs,
                    direction: 'credited to',
                    newBalanceRs,
                    source: `Order #${orderId.substring(0, 8).toUpperCase()} Settlement`,
                    dedupeId: `order_settle_${orderId}`
                }).catch(e => console.error('[Order Status API] Merchant WhatsApp transaction alert failed:', e));
            }
        }

        return NextResponse.json({ success: true, message: rpcResult.message });

    } catch (error) {
        console.error('[API] Order Status Update Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
