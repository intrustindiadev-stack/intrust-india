import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// Get orders for an investment (merchant or admin)
export async function GET(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const investmentId = searchParams.get('investmentId');

        if (investmentId) {
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
        }

        // Admin: get all orders
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('merchant_investment_orders')
            .select('*, investment:merchant_investments(merchant_id, amount_paise, interest_rate_percent, merchant:merchants(business_name))')
            .order('order_date', { ascending: false })
            .limit(200);

        if (error) throw error;
        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Feed a new simulated order record (Admin only)
export async function POST(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { investmentId, orderDetails, amountRupees, profitRupees, orderDate, location, category } = await request.json();

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
                order_date: orderDate || new Date().toISOString(),
                location: location || null,
                category: category || 'General',
            })
            .select()
            .single();

        if (error) throw error;

        // Notify merchant about new return
        try {
            const { data: merchant } = await supabase
                .from('merchants')
                .select('user_id')
                .eq('id', investment.merchant_id)
                .single();

            if (merchant) {
                await supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: 'Aapki Kamai Aayi! 💸',
                    body: `${location ? location + ' se ' : ''}${category || 'order'} mein ₹${Number(profitRupees).toLocaleString('en-IN')} ki kamai aayi!`,
                    type: 'success',
                    reference_id: data.id,
                    reference_type: 'investment_order'
                });
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
