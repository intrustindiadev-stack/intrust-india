import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // User-scoped client so RLS (auth.uid() = user_id) is satisfied
    const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    try {
        let transaction = null;

        // Try UUID match first
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUUID) {
            const { data } = await userClient
                .from('transactions')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();
            transaction = data;
        }

        // Fall back to client_txn_id if not found by UUID
        if (!transaction) {
            const { data } = await userClient
                .from('transactions')
                .select('*')
                .eq('client_txn_id', id)
                .eq('user_id', user.id)
                .single();
            transaction = data;
        }

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        // Attach gift card metadata via admin client (bypasses RLS on coupons)
        if (transaction.udf1 === 'GIFT_CARD' && transaction.udf2) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
            const { data: couponData } = await supabaseAdmin
                .from('coupons')
                .select('id, brand, title, face_value_paise')
                .eq('id', transaction.udf2)
                .single();
            if (couponData) {
                transaction.gift_card = couponData;
            }
        }

        return NextResponse.json({ transaction });
    } catch (error) {
        console.error('Fetch Details Error:', error);
        return NextResponse.json({ error: 'Failed to fetch transaction details' }, { status: 500 });
    }
}
