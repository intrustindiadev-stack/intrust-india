import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// Get orders for an investment
export async function GET(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const investmentId = searchParams.get('investmentId');

        if (!investmentId) return NextResponse.json({ error: 'Investment ID is required' }, { status: 400 });

        // Security check: if not admin, must be the owner
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            const { data: merchant } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
            const { data: investment } = await supabase.from('merchant_investments').select('merchant_id').eq('id', investmentId).single();
            if (!merchant || !investment || merchant.id !== investment.merchant_id) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }

        const { data, error } = await supabase
            .from('merchant_investment_orders')
            .select('*')
            .eq('investment_id', investmentId)
            .order('order_date', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Feed a new order record
export async function POST(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { investmentId, orderDetails, amountRupees, profitRupees, orderDate } = await request.json();

        if (!investmentId || !orderDetails || !amountRupees || !profitRupees) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data: investment } = await supabase
            .from('merchant_investments')
            .select('merchant_id, status')
            .eq('id', investmentId)
            .single();

        if (!investment || investment.status !== 'active') {
            return NextResponse.json({ error: 'Investment must be active to feed orders' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('merchant_investment_orders')
            .insert({
                investment_id: investmentId,
                merchant_id: investment.merchant_id,
                order_details: orderDetails,
                amount_paise: Math.round(Number(amountRupees) * 100),
                profit_paise: Math.round(Number(profitRupees) * 100),
                order_date: orderDate || new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
