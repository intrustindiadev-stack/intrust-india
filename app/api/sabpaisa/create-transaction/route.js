import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const body = await req.json();
        const { clientTxnId, amount, udf1, udf2, udf3, payerEmail, payerMobile, payerName } = body;

        // Use service role to bypass RLS, but authenticate the user first
        const supabaseContextClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            }
        );

        const { data: { user }, error: authError } = await supabaseContextClient.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Now insert with service-role client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { error: insertError } = await supabaseAdmin
            .from('transactions')
            .insert({
                client_txn_id: clientTxnId,
                user_id: user.id,
                amount: amount,
                status: 'initiated',
                udf1: udf1,
                udf2: udf2,
                udf3: udf3,
                payer_email: payerEmail,
                payer_mobile: payerMobile,
                payer_name: payerName
            });

        if (insertError) {
            console.error('[Sabpaisa CreateTxn] Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Sabpaisa CreateTxn] API route error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
