import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        const { data: withdrawals, error } = await supabase
            .from('ai_orders_vault_transactions')
            .select(`
                id,
                amount_paise,
                status,
                created_at,
                ai_orders_vault (
                    id,
                    merchant_id,
                    merchants (
                        id,
                        business_name,
                        email
                    )
                )
            `)
            .eq('type', 'WITHDRAWAL')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ withdrawals });
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
    }
}
