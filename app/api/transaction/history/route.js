import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ transactions });
    } catch (error) {
        console.error('Fetch History Error:', error);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}
