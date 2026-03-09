import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    try {
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        const t = 'wallet_topup';
        const { error: insErr, data } = await supabaseAdmin.from('merchant_transactions').insert({
            merchant_id: '6c245dce-038a-444f-8eed-1b3d6cd9f608',
            transaction_type: t,
            amount_paise: 0,
            commission_paise: 0,
            balance_after_paise: 0,
            description: 'test wallet_topup'
        }).select();

        if (!insErr) {
            await supabaseAdmin.from('merchant_transactions').delete().eq('merchant_id', '6c245dce-038a-444f-8eed-1b3d6cd9f608').eq('transaction_type', t).eq('description', 'test wallet_topup');
        }

        return NextResponse.json({ success: !insErr, error: insErr ? insErr.message : null, data });
    } catch (error) {
        return NextResponse.json({ error: error.message, stack: error.stack });
    }
}
