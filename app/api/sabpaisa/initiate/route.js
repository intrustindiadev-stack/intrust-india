// Force Node.js runtime — this route uses AES-256-GCM encryption via node:crypto
// (transitively through lib/sabpaisa/encrypt.js → buildEncryptedPayload).
// The Edge runtime does not expose Node crypto, so we must pin explicitly.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { buildEncryptedPayload } from '@/lib/sabpaisa/payload';
import { sabpaisaConfig, validateCallbackConfig } from '@/lib/sabpaisa/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { MERCHANT_SUBSCRIPTION_PLANS } from '@/lib/constants';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Returns a sanitized JSON failure response with an opaque correlation ID.
 * Full diagnostic details are logged server-side only.
 */
function failResponse(status, clientMessage, correlationId, internalDetails = null) {
    if (internalDetails) {
        console.error(
            `[SabPaisa Initiate][${correlationId}] ${clientMessage}`,
            internalDetails
        );
    }
    return NextResponse.json(
        { error: clientMessage, correlationId },
        { status }
    );
}

export async function POST(request) {
    const correlationId = randomUUID();

    try {
        // ── Preflight: required environment variables ──
        const missingEnvVars = [];
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingEnvVars.push('NEXT_PUBLIC_SUPABASE_URL');
        if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missingEnvVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingEnvVars.push('SUPABASE_SERVICE_ROLE_KEY');

        if (missingEnvVars.length > 0) {
            return failResponse(
                500,
                'Server configuration error. Please contact support.',
                correlationId,
                `Missing required environment variables: ${missingEnvVars.join(', ')}`
            );
        }

        // ── Preflight: callback URL must be HTTPS in production ──
        const callbackConfigError = validateCallbackConfig();
        if (callbackConfigError) {
            return failResponse(
                500,
                'Payment gateway is not configured for this environment. Please contact support.',
                correlationId,
                `Callback config invalid: ${callbackConfigError}`
            );
        }

        // ── Parse request body ──
        const orderData = await request.json().catch(() => null);
        if (!orderData) {
            return failResponse(400, 'Invalid request body.', correlationId);
        }

        // ── Auth header ──
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return failResponse(401, 'Missing or invalid authorization header.', correlationId);
        }
        const token = authHeader.split('Bearer ')[1];

        // ── Verify user via scoped Supabase client ──
        const supabaseContextClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        const { data: { user }, error: authError } = await supabaseContextClient.auth.getUser();
        if (authError || !user) {
            return failResponse(401, 'Unauthorized.', correlationId, authError);
        }

        // ── Admin Supabase client for privileged operations ──
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // ── Canonical Amount Derivation (Security Guard) ──
        let canonicalAmountPaise = 0;
        const udf1 = orderData.udf1 || '';
        const udf2 = orderData.udf2 || ''; // groupId for CART, productId for GIFT
        const udf3 = orderData.udf3 || ''; // planKey for SUB

        if (udf1 === 'CART_CHECKOUT') {
            const { data: group, error: groupErr } = await supabaseAdmin
                .from('shopping_order_groups')
                .select('total_amount_paise')
                .eq('id', udf2)
                .single();
            if (groupErr || !group) {
                return failResponse(400, 'Invalid or missing order group ID.', correlationId, groupErr);
            }
            canonicalAmountPaise = group.total_amount_paise;
        } else if (udf1 === 'MERCHANT_SUBSCRIPTION') {
            const plan = MERCHANT_SUBSCRIPTION_PLANS.find(p => p.key === udf3);
            if (!plan) {
                return failResponse(400, 'Invalid subscription plan selection.', correlationId);
            }
            canonicalAmountPaise = Math.round(plan.price * 100);
        } else if (udf1 === 'GIFT_CARD') {
            const { data: product, error: prodErr } = await supabaseAdmin
                .from('shopping_products')
                .select('suggested_retail_price_paise, is_gift_card')
                .eq('id', udf2)
                .single();
            if (prodErr || !product || !product.is_gift_card) {
                return failResponse(400, 'Invalid gift card selection.', correlationId, prodErr);
            }

            // KYC guard for gift card purchases
            const { data: profile } = await supabaseAdmin
                .from('user_profiles')
                .select('kyc_status')
                .eq('id', user.id)
                .single();

            if (!profile || profile.kyc_status !== 'verified') {
                return failResponse(
                    403,
                    'KYC Verification is required to purchase gift cards. Please complete KYC from your profile.',
                    correlationId
                );
            }

            canonicalAmountPaise = product.suggested_retail_price_paise;
        } else {
            // Variable price transactions (Wallet/Merchant Topups)
            // We still derive it server-side from the input to ensure it is paise-clean
            canonicalAmountPaise = Math.round(Number(orderData.amount) * 100);
        }

        if (canonicalAmountPaise <= 0 || isNaN(canonicalAmountPaise)) {
            return failResponse(400, 'Invalid payment amount.', correlationId);
        }

        // Override client amount with server-derived canonical amount for gateway encryption
        orderData.amount = (canonicalAmountPaise / 100).toFixed(2);
        
        // ── Persist transaction record ──
        const { error: insertError } = await supabaseAdmin
            .from('transactions')
            .insert({
                client_txn_id: orderData.clientTxnId,
                user_id: user.id,
                amount: Number(orderData.amount),
                expected_amount_paise: canonicalAmountPaise, // Track for callback validation
                status: 'INITIATED',
                udf1: udf1,
                udf2: udf2,
                udf3: udf3,
                payer_email: orderData.payerEmail || '',
                payer_mobile: orderData.payerMobile || '',
                payer_name: orderData.payerName || ''
            });

        if (insertError) {
            return failResponse(
                500,
                'Failed to create transaction record. Please try again.',
                correlationId,
                insertError
            );
        }

        if (isDev) {
            console.log(`[SabPaisa Initiate][${correlationId}] TxnId: ${orderData.clientTxnId}, Amount: ${orderData.amount}`);
        }

        // ── Encrypt payload for gateway ──
        const encData = buildEncryptedPayload(orderData);

        if (!encData) {
            return failResponse(
                500,
                'Payment initiation failed. Please try again.',
                correlationId,
                'buildEncryptedPayload returned null'
            );
        }

        return NextResponse.json({
            paymentUrl: sabpaisaConfig.initUrl,
            encData: encData,
            clientCode: sabpaisaConfig.clientCode
        });

    } catch (error) {
        // Sanitized client response — no stack, no internal detail
        return failResponse(
            500,
            'An unexpected error occurred. Please try again or contact support.',
            correlationId,
            { message: error.message, stack: error.stack }
        );
    }
}
