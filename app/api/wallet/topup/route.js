import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Convenience endpoint: validates wallet top-up amount limits before the frontend
// calls the actual payment/initiate endpoint with UDF1='WALLET_TOPUP'.
export async function POST(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await request.json();

    const MIN_TOPUP = parseInt(process.env.WALLET_MIN_TOPUP || '100');
    const MAX_TOPUP = parseInt(process.env.WALLET_MAX_TOPUP || '10000');

    if (amount < MIN_TOPUP || amount > MAX_TOPUP) {
        return NextResponse.json(
            { error: `Amount must be between ₹${MIN_TOPUP} and ₹${MAX_TOPUP}` },
            { status: 400 }
        );
    }

    return NextResponse.json({
        success: true,
        message: 'Proceed to payment initiation',
        validatedAmount: amount,
    });
}
