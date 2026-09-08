import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    try {
        const { id: orderId } = await params;
        const { user, profile, admin: supabaseAdmin } = await getAuthUser(request);
        
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch the order to get the amounts
        const { data: order, error: orderError } = await supabaseAdmin
            .from('ai_orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status !== 'ACCEPTED' || !order.merchant_id) {
            return NextResponse.json({ error: 'Order cannot be completed yet' }, { status: 400 });
        }

        // Call atomic RPC to complete order and credit vault
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('complete_ai_order_and_credit_vault', {
            p_order_id: orderId,
            p_merchant_id: order.merchant_id,
            p_principal_amount_paise: order.wholesale_price_paise,
            p_profit_amount_paise: order.profit_margin_paise
        });

        if (rpcError) throw rpcError;

        // --- Generate Invoice (B2B Transaction) ---
        try {
            // Fetch merchant profile
            const { data: merchantProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('full_name, email, phone')
                .eq('id', order.merchant_id)
                .single();

            const invoiceCode = `INV-AI-${Date.now()}`;
            const subtotal = order.wholesale_price_paise || 0;
            const tax = order.gst_amount_paise || Math.round(subtotal * 0.18);
            const grandTotal = subtotal + tax;

            const invoicePayload = {
                invoice_number: invoiceCode,
                invoice_date: new Date().toISOString().split('T')[0],
                due_date: new Date().toISOString().split('T')[0],
                seller_snapshot: {
                    name: 'Intrust India',
                    email: 'support@intrust.in'
                },
                customer_snapshot: {
                    name: merchantProfile?.full_name || 'Merchant',
                    email: merchantProfile?.email || '—'
                },
                items_snapshot: [
                    {
                        name: order.product_name,
                        quantity: 1,
                        price_paise: subtotal,
                        tax_paise: tax,
                        total_paise: grandTotal
                    }
                ],
                subtotal_paise: subtotal,
                tax_paise: tax,
                grand_total_paise: grandTotal,
                amount_paid_paise: grandTotal,
                status: 'PAID',
                public_payment_token: `tok_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                paid_at: new Date().toISOString(),
                created_by: user.id
            };

            const { data: invoiceRecord, error: invoiceError } = await supabaseAdmin
                .from('invoices')
                .insert([invoicePayload])
                .select('id')
                .single();

            if (!invoiceError && invoiceRecord) {
                // Link invoice to AI order
                await supabaseAdmin
                    .from('ai_orders')
                    .update({ invoice_id: invoiceRecord.id })
                    .eq('id', orderId);
            } else {
                console.error('[AI Order Complete] Invoice creation failed:', invoiceError);
            }
        } catch (invErr) {
            console.error('[AI Order Complete] Invoice processing error:', invErr);
        }

        return NextResponse.json({ success: true, vault_balance: rpcData.new_balance_paise });

    } catch (error) {
        console.error('Error completing AI order:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
