import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/merchant/investments — fetch all investments + aggregated order profit
export async function GET(request) {
    try {
        const { user, admin: supabase } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: merchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!merchant) return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });

        const { data: investments, error } = await supabase
            .from('merchant_investments')
            .select('*')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch all orders for this merchant's investments
        const investmentIds = (investments || []).map(i => i.id);
        let orders = [];
        if (investmentIds.length > 0) {
            const { data: orderData } = await supabase
                .from('merchant_investment_orders')
                .select('*')
                .in('investment_id', investmentIds)
                .order('order_date', { ascending: false });
            orders = orderData || [];
        }

        return NextResponse.json({ data: investments || [], allOrders: orders });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/merchant/investments — create investment request
export async function POST(request) {
    try {
        const { user, admin: supabase } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: merchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!merchant) return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });

        const { amountRupees, description } = await request.json();
        if (!amountRupees) return NextResponse.json({ error: 'Amount is required' }, { status: 400 });

        const amount = Number(amountRupees);
        if (amount < 10000) return NextResponse.json({ error: 'Minimum investment is ₹10,000' }, { status: 400 });

        const amountPaise = Math.round(amount * 100);

        const { data, error } = await supabase
            .from('merchant_investments')
            .insert({
                merchant_id: merchant.id,
                amount_paise: amountPaise,
                description: description || '',
                status: 'pending',
                interest_rate_percent: 12.0,
                duration_days: 365,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
