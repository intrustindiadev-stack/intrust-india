export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { buildEncryptedPayload } from '@/lib/sabpaisa/payload';
import { sabpaisaConfig, validateCallbackConfig } from '@/lib/sabpaisa/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { validatePayerContact } from '@/lib/merchant/validatePayerContact';

import { normalizePayerMobile } from '@/lib/merchant/payerContactRules';

function failResponse(status, clientMessage, correlationId, internalDetails = null) {
    if (internalDetails) {
        console.error(`[Invoice Initiate][${correlationId}] ${clientMessage}`, internalDetails);
    }
    return NextResponse.json({ error: clientMessage, correlationId }, { status });
}

export async function POST(request, { params }) {
    const correlationId = randomUUID();
    
    try {
        const { token } = await params;
        if (!token || token.length !== 32) {
            return failResponse(400, 'Invalid invoice token.', correlationId);
        }

        const callbackConfigError = validateCallbackConfig();
        if (callbackConfigError) {
            return failResponse(500, 'Payment gateway config error.', correlationId, callbackConfigError);
        }

        const body = await request.json().catch(() => null);
        if (!body) {
            return failResponse(400, 'Invalid request body.', correlationId);
        }

        const payerValidation = validatePayerContact({ email: body.payerEmail, phone: body.payerMobile }, { allowMissingPhone: false });
        if (payerValidation.errors.email) {
            return NextResponse.json({ error: 'INVALID_PAYER_CONTACT', message: payerValidation.errors.email, field: 'payerEmail' }, { status: 400 });
        }
        if (payerValidation.errors.phone) {
            return NextResponse.json({ error: 'INVALID_PAYER_CONTACT', message: payerValidation.errors.phone, field: 'payerMobile' }, { status: 400 });
        }

        const normalizedMobile = normalizePayerMobile(body.payerMobile);
        const payerEmail = (body.payerEmail || '').trim().toLowerCase();
        const payerName = (body.payerName || 'Customer').trim();

        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Fetch invoice
        const { data: invoice, error: invoiceErr } = await supabaseAdmin
            .from('invoices')
            .select('id, grand_total_paise, amount_paid_paise, status')
            .eq('public_payment_token', token)
            .single();

        if (invoiceErr || !invoice) {
            return failResponse(404, 'Invoice not found.', correlationId, invoiceErr);
        }

        if (invoice.status === 'PAID') {
            return failResponse(400, 'This invoice has already been fully paid.', correlationId);
        }
        
        if (invoice.status === 'CANCELLED' || invoice.status === 'VOID') {
            return failResponse(400, 'This invoice is no longer valid.', correlationId);
        }

        const amountDuePaise = invoice.grand_total_paise - invoice.amount_paid_paise;
        if (amountDuePaise <= 0) {
            return failResponse(400, 'No amount is due on this invoice.', correlationId);
        }

        const clientTxnId = `INV_${Date.now().toString(36).toUpperCase()}_${randomUUID().split('-')[0]}`;
        const udf1 = 'INVOICE_PAY';
        const udf2 = invoice.id;
        const amountStr = (amountDuePaise / 100).toFixed(2);

        // Persist transaction record (without user_id since it's anonymous payment)
        const { error: insertError } = await supabaseAdmin
            .from('transactions')
            .insert({
                client_txn_id: clientTxnId,
                amount: Number(amountStr),
                expected_amount_paise: amountDuePaise,
                status: 'initiated',
                udf1: udf1,
                udf2: udf2,
                payer_email: payerEmail,
                payer_mobile: normalizedMobile,
                payer_name: payerName
            });

        if (insertError) {
            return failResponse(500, 'Failed to create transaction record.', correlationId, insertError);
        }

        const orderData = {
            clientTxnId,
            amount: amountStr,
            payerName: payerName,
            payerEmail: payerEmail,
            payerMobile: normalizedMobile,
            udf1,
            udf2
        };

        const encData = buildEncryptedPayload(orderData);
        if (!encData) {
            return failResponse(500, 'Payment initiation failed.', correlationId, 'Encryption returned null');
        }

        return NextResponse.json({
            paymentUrl: sabpaisaConfig.initUrl,
            encData: encData,
            clientCode: sabpaisaConfig.clientCode
        });

    } catch (error) {
        return failResponse(500, 'An unexpected error occurred.', correlationId, { message: error.message, stack: error.stack });
    }
}
