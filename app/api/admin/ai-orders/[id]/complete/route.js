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

        // Call atomic RPC
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('complete_ai_order_and_credit_vault', {
            p_order_id: orderId,
            p_merchant_id: order.merchant_id,
            p_principal_amount_paise: order.wholesale_price_paise,
            p_profit_amount_paise: order.profit_margin_paise
        });

        if (rpcError) throw rpcError;

        return NextResponse.json({ success: true, vault_balance: rpcData.new_balance_paise });

    } catch (error) {
        console.error('Error completing AI order:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
