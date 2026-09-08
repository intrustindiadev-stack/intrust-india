import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function GET(request) {
    try {
        const { user, admin: supabaseAdmin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: vault, error } = await supabaseAdmin
            .from('ai_orders_vault')
            .select('*')
            .eq('merchant_id', user.id)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json({ vault: vault || null });
    } catch (error) {
        console.error('Error fetching vault:', error);
        return NextResponse.json({ error: 'Failed to fetch vault details' }, { status: 500 });
    }
}

