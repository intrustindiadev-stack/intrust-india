import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { merchantId } = await params;
        const supabase = createAdminClient();

        // 1. Auth & Admin Check
        const { data: { user } } = await supabase.auth.getUser(request.headers.get('authorization')?.replace('Bearer ', ''));
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Fetch Merchant details
        const { data: merchant, error: mError } = await supabase
            .from('merchants')
            .select(`
                id, business_name, user_id, wallet_balance_paise,
                user_profiles(full_name, email, phone)
            `)
            .eq('id', merchantId)
            .single();

        if (mError) throw mError;
        if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

        // 3. Fetch AI Grow Investments
        const { data: aiGrow, error: aError } = await supabase
            .from('merchant_investments')
            .select('*')
            .eq('merchant_id', merchantId)
            .order('created_at', { ascending: false });

        if (aError) throw aError;

        // 4. Fetch Lockin Balances
        const { data: lockin, error: lError } = await supabase
            .from('merchant_lockin_balances')
            .select('*')
            .eq('merchant_id', merchantId)
            .order('created_at', { ascending: false });

        if (lError) throw lError;

        // Calculate totals
        const activeAiGrowAmount = aiGrow.filter(i => i.status === 'active').reduce((sum, i) => sum + i.amount_paise, 0);
        const activeLockinAmount = lockin.filter(l => l.status === 'active').reduce((sum, l) => sum + l.amount_paise, 0);

        return NextResponse.json({
            data: {
                merchant: {
                    ...merchant,
                    total_active_capital_paise: activeAiGrowAmount + activeLockinAmount,
                    total_ai_grow_paise: activeAiGrowAmount,
                    total_lockin_paise: activeLockinAmount
                },
                investments: aiGrow || [],
                lockins: lockin || []
            }
        });

    } catch (err) {
        console.error('Portfolio API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
