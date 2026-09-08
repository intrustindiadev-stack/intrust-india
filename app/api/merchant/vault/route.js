import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET() {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: merchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        const { data: vault, error } = await supabase
            .from('ai_orders_vault')
            .select('*')
            .eq('merchant_id', merchant.id)
            .single();

        if (error) throw error;

        return NextResponse.json({ vault });
    } catch (error) {
        console.error('Error fetching vault:', error);
        return NextResponse.json({ error: 'Failed to fetch vault details' }, { status: 500 });
    }
}
