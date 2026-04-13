import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // 1. Auth & Admin Check (Bearer token or SSR cookie)
        const { user: authUser, profile: adminProfile, admin: supabase } = await getAuthUser(request);

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(adminProfile?.role)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // 2. Body Validation
        const body = await request.json();
        const { merchantId, amountRupees, interestRate, periodMonths } = body;

        if (!merchantId || !amountRupees || !interestRate || !periodMonths) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const amountPaise = Math.round(Number(amountRupees) * 100);
        const lockinMonths = parseInt(periodMonths, 10);
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(startDate.getMonth() + lockinMonths);

        // 3. Insert Record
        const { data, error: insertError } = await supabase
            .from('merchant_lockin_balances')
            .insert({
                merchant_id: merchantId,
                amount_paise: amountPaise,
                interest_rate: Number(interestRate),
                lockin_period_months: lockinMonths,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'active',
                admin_id: authUser.id,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // 4. Create Notification for Merchant
        try {
            const { data: merchant } = await supabase
                .from('merchants')
                .select('user_id')
                .eq('id', merchantId)
                .single();

            if (merchant) {
                await supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: 'New Lockin Balance Created',
                    body: `₹${Number(amountRupees).toLocaleString('en-IN')} has been locked for ${lockinMonths} months at ${interestRate}% p.a.`,
                    type: 'info',
                    reference_id: data.id,
                    reference_type: 'lockin_balance',
                });
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        return NextResponse.json({
            success: true,
            id: data.id,
            endDate: data.end_date,
        });

    } catch (err) {
        console.error('Unhandled error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const supabase = createAdminClient();

        // Admin check (simplified for GET)
        const { data: { user } } = await supabase.auth.getUser(request.headers.get('authorization')?.replace('Bearer ', ''));
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        if (!['admin', 'super_admin'].includes(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { data, error } = await supabase
            .from('merchant_lockin_balances')
            .select(`
                *,
                merchant:merchants(id, business_name, user_id, user_profiles(full_name, email))
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
