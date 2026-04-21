import { NextResponse } from 'next/server';
import { buildEncryptedPayload } from '@/lib/sabpaisa/payload';
import { sabpaisaConfig } from '@/lib/sabpaisa/config';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    const correlationId = crypto.randomUUID();

    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const { requestId } = await request.json();
        if (!requestId) {
            return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
        }

        // 1. Fetch udhari request (must be approved and belong to customer)
        const { data: udhariRequest, error: fetchError } = await supabaseAdmin
            .from('udhari_requests')
            .select('*, coupon:coupons(id, title, brand, selling_price_paise)')
            .eq('id', requestId)
            .eq('customer_id', user.id)
            .eq('status', 'approved')
            .single();

        if (fetchError || !udhariRequest) {
            return NextResponse.json({ error: 'Udhari request not found or not approved' }, { status: 404 });
        }

        // 2. Fetch merchant settings (optional skeleton for future validation)
        const { data: settings } = await supabaseAdmin
            .from('merchant_udhari_settings')
            .select('*')
            .eq('merchant_id', udhariRequest.merchant_id)
            .single();

        const purchaseAmountPaise = udhariRequest.amount_paise;
        const extraFeePaise = Math.round(purchaseAmountPaise * 0.03); // 3% convenience fee
        const totalAmountPaise = purchaseAmountPaise + extraFeePaise;
        const totalAmountRupees = (totalAmountPaise / 100).toFixed(2);

        // 3. Create transaction record for tracking & idempotency
        const clientTxnId = uuidv4();
        const { error: txnError } = await supabaseAdmin
            .from('transactions')
            .insert({
                client_txn_id: clientTxnId,
                user_id: user.id,
                amount: parseFloat(totalAmountRupees),
                status: 'initiated',
                udf1: 'UDHARI_PAYMENT',
                udf2: requestId,
                udf3: udhariRequest.merchant_id,
                payer_email: user.email || '',
                payer_mobile: '',
                payer_name: ''
            });

        if (txnError) {
            console.error(JSON.stringify({ correlationId, stage: 'txn_insert', error: txnError }));
            return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
        }

        // 4. Build encrypted SabPaisa payload
        const orderData = {
            clientTxnId,
            amount: totalAmountRupees,
            payerEmail: user.email || '',
            payerMobile: '',
            payerName: '',
            udf1: 'UDHARI_PAYMENT',
            udf2: requestId,
            udf3: udhariRequest.merchant_id
        };

        const encData = buildEncryptedPayload(orderData);
        if (!encData) {
            console.error(JSON.stringify({ correlationId, stage: 'encryption', error: 'buildEncryptedPayload returned null' }));
            return NextResponse.json({ error: 'Encryption failed' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            paymentUrl: sabpaisaConfig.initUrl,
            encData,
            clientCode: sabpaisaConfig.clientCode,
            clientTxnId
        });

    } catch (error) {
        console.error(JSON.stringify({ correlationId: 'udhari-sabpaisa', stage: 'unexpected_error', error: error?.message || String(error) }));
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
