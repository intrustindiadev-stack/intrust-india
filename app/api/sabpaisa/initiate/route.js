import { NextResponse } from 'next/server';
import { buildEncryptedPayload } from '@/lib/sabpaisa/payload';
import { sabpaisaConfig } from '@/lib/sabpaisa/config';
import { createClient } from '@supabase/supabase-js';

const isDev = process.env.NODE_ENV !== 'production';

export async function POST(request) {
    const orderData = await request.json().catch(() => null);

    if (!orderData) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];

    const supabaseContextClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabaseContextClient.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (orderData.udf1 === 'GIFT_CARD') {
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('kyc_status')
            .eq('id', user.id)
            .single();

        if (!profile || profile.kyc_status !== 'verified') {
            return NextResponse.json({ error: 'KYC Verification is required to purchase gift cards. Please complete KYC from your profile.' }, { status: 403 });
        }
    }

    const { error: insertError } = await supabaseAdmin
        .from('transactions')
        .insert({
            client_txn_id: orderData.clientTxnId,
            user_id: user.id,
            amount: Number(orderData.amount),
            status: 'INITIATED',
            udf1: orderData.udf1 || '',
            udf2: orderData.udf2 || '',
            udf3: orderData.udf3 || '',
            payer_email: orderData.payerEmail || '',
            payer_mobile: orderData.payerMobile || '',
            payer_name: orderData.payerName || ''
        });

    if (insertError) {
        console.error('[Sabpaisa Initiate] Transaction insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create transaction record' }, { status: 500 });
    }

    // Log incoming request immediately with safe details only
    if (isDev) {
        console.log(`[Sabpaisa Initiate] TxnId: ${orderData.clientTxnId}, Amount: ${orderData.amount}`);
    }

    try {
        const encData = buildEncryptedPayload(orderData);

        if (!encData) {
            const errMsg = 'buildEncryptedPayload returned null';
            if (isDev) {
                console.error(`[Sabpaisa Initiate] ERROR: ${errMsg}`);
            }
            return NextResponse.json({ error: errMsg }, { status: 500 });
        }

        return NextResponse.json({
            paymentUrl: sabpaisaConfig.initUrl,
            encData: encData,
            clientCode: sabpaisaConfig.clientCode
        });

    } catch (error) {
        const errMsg = `Encryption error: ${error.message}\n${error.stack}`;
        console.error('[SabPaisa API] Error:', errMsg);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
