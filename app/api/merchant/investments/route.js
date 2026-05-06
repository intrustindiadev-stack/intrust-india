import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// Get my investments
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

        const { data, error } = await supabase
            .from('merchant_investments')
            .select('*')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Create investment request
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

        const amountPaise = Math.round(Number(amountRupees) * 100);

        const { data, error } = await supabase
            .from('merchant_investments')
            .insert({
                merchant_id: merchant.id,
                amount_paise: amountPaise,
                description: description || '',
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
