// Force Node.js runtime — this route uses AES-256-GCM encryption via node:crypto
// (transitively through lib/sabpaisa/encrypt.js → buildEncryptedPayload).
// The Edge runtime does not expose Node crypto, so we must pin explicitly.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { buildEncryptedPayload } from '@/lib/sabpaisa/payload';
import { sabpaisaConfig, validateCallbackConfig } from '@/lib/sabpaisa/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { GOLD_SUBSCRIPTION_PLANS } from '@/lib/constants';
import { getPricingSettings } from '@/app/(admin)/admin/settings/actions';
import { resolveMerchantPlanPaise } from '@/lib/merchant/subscriptionPricing';
import { validatePayerContact } from '@/lib/merchant/validatePayerContact';
import { isTopupUdf1, WALLET_TOPUP_FALLBACK_MOBILE } from '@/lib/sabpaisa/topupFallback';
import { normalizePayerMobile, DENIED_PAYER_MOBILES } from '@/lib/merchant/payerContactRules';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import crypto from 'crypto';

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

        // ── Validate Request Shape ──
        const validationLog = (field) => {
            console.warn(`[SabPaisa Initiate][${correlationId}] Validation failed for field: ${field}, merchant: ${orderData.udf2 || 'unknown'}`);
        };

        const isTopup = isTopupUdf1(orderData.udf1);

        const payerValidation = validatePayerContact(
            { email: orderData.payerEmail, phone: orderData.payerMobile },
            { allowMissingPhone: isTopup }
        );

        // 1. Validate payerEmail
        if (payerValidation.errors.email) {
            validationLog('payerEmail');
            return NextResponse.json(
                { error: 'INVALID_PAYER_CONTACT', message: payerValidation.errors.email, field: 'payerEmail' },
                { status: 400 }
            );
        }

        // 2. Validate payerMobile
        if (payerValidation.errors.phone) {
            if (!isTopup) {
                validationLog('payerMobile');
                return NextResponse.json(
                    { error: 'INVALID_PAYER_CONTACT', message: payerValidation.errors.phone, field: 'payerMobile' },
                    { status: 400 }
                );
            }
        }

        // 3. Validate clientTxnId
        const txnIdRegex = /^[A-Za-z0-9_]+$/;
        if (!orderData.clientTxnId || typeof orderData.clientTxnId !== 'string' || orderData.clientTxnId.length > 64 || !txnIdRegex.test(orderData.clientTxnId)) {
            validationLog('clientTxnId');
            return NextResponse.json(
                { error: 'INVALID_TRANSACTION_ID', message: 'A valid transaction ID is required.', field: 'clientTxnId' },
                { status: 400 }
            );
        }

        // 4. Validate amount
        const parsedAmount = Number(orderData.amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000000) {
            validationLog('amount');
            return NextResponse.json(
                { error: 'INVALID_AMOUNT', message: 'A valid payment amount (up to ₹1 Crore) is required.', field: 'amount' },
                { status: 400 }
            );
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

        // ── Retrieve full session to capture refresh_token for iOS recovery ──
        const supabaseServer = await createServerSupabaseClient();
        const { data: { session: fullSession } } = await supabaseServer.auth.getSession();
        
        const refreshToken = fullSession?.refresh_token || null;
        if (!refreshToken) {
            console.warn(`[SabPaisa Initiate][${correlationId}] Missing refresh token in cookies. Safari recovery may fail.`);
        }

        // ── Admin Supabase client for privileged operations ──
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // ── Canonical Amount Derivation (Security Guard) ──
        let canonicalAmountPaise = 0;
        const udf1 = orderData.udf1 || '';
        let udf2 = orderData.udf2 || ''; // groupId for CART, productId for GIFT
        const udf3 = orderData.udf3 || ''; // planKey for SUB

        if (typeof udf2 === 'string') {
            // Remove special characters that gateways reject, keeping basic punctuation.
            // Truncate to 50 characters to stay within typical UDF limits.
            udf2 = udf2.replace(/[^a-zA-Z0-9\s\-_.,@]/g, '').trim().substring(0, 50);
            orderData.udf2 = udf2;
        }

        if (udf1 === 'CART_CHECKOUT') {
            // Execute the RPC server-side to guarantee atomicity and shield from client network blockers
            const { data: draftData, error: draftErr } = await supabaseContextClient.rpc("draft_cart_orders", { p_customer_id: user.id });
            
            if (draftErr) {
                return failResponse(500, 'Failed to create order draft.', correlationId, draftErr);
            }
            if (!draftData || !draftData.success) {
                return failResponse(400, draftData?.message || 'Failed to create order draft.', correlationId);
            }
            
            udf2 = draftData.group_id;
            orderData.udf2 = udf2; // Override incoming udf2 with the newly generated group ID
            canonicalAmountPaise = draftData.total_paise;
        } else if (udf1 === 'MERCHANT_SUBSCRIPTION') {
            // ── Ownership verification: caller must own the merchant record they are paying for ──
            const { data: merchantOwner, error: merchantOwnerErr } = await supabaseAdmin
                .from('merchants')
                .select('user_id')
                .eq('id', udf2)
                .single();

            if (merchantOwnerErr || !merchantOwner) {
                return failResponse(400, 'Invalid merchant reference.', correlationId, merchantOwnerErr);
            }

            if (merchantOwner.user_id !== user.id) {
                return failResponse(
                    403,
                    'Unauthorized: You do not own this merchant account.',
                    correlationId,
                    `user ${user.id} attempted to initiate subscription for merchant ${udf2} (owned by ${merchantOwner.user_id})`
                );
            }

            const pricing = await getPricingSettings();
            const resolvedPaise = resolveMerchantPlanPaise(pricing, udf3);
            if (resolvedPaise === null) {
                return failResponse(400, 'Invalid subscription plan selection.', correlationId);
            }
            canonicalAmountPaise = resolvedPaise;
        } else if (udf1 === 'GIFT_CARD') {
            // udf2 = coupons.id (the specific coupon being purchased)
            const { data: coupon, error: couponErr } = await supabaseAdmin
                .from('coupons')
                .select('selling_price_paise, status')
                .eq('id', udf2)
                .single();

            if (couponErr || !coupon) {
                return failResponse(400, 'Invalid gift card selection.', correlationId, couponErr);
            }
            if (coupon.status !== 'available') {
                return failResponse(400, 'This gift card is no longer available for purchase.', correlationId);
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

            canonicalAmountPaise = coupon.selling_price_paise;
        } else if (udf1 === 'NFC_ORDER') {
            // udf2 = nfc_orders.id (created before payment initiation)
            const { data: nfcOrder, error: nfcErr } = await supabaseAdmin
                .from('nfc_orders')
                .select('sale_price_paise, payment_status, user_id')
                .eq('id', udf2)
                .single();

            if (nfcErr || !nfcOrder) {
                return failResponse(400, 'Invalid NFC order reference.', correlationId, nfcErr);
            }
            if (nfcOrder.user_id !== user.id) {
                return failResponse(403, 'Unauthorized: You do not own this NFC order.', correlationId);
            }
            if (nfcOrder.payment_status !== 'pending') {
                return failResponse(400, 'This NFC order has already been paid or is in an invalid state.', correlationId);
            }

            canonicalAmountPaise = nfcOrder.sale_price_paise;
        } else if (udf1 === 'WHOLESALE_PURCHASE') {
            // udf2 = wholesale_order_drafts.id
            const { data: draft, error: draftErr } = await supabaseAdmin
                .from('wholesale_order_drafts')
                .select('total_amount_paise, status')
                .eq('id', udf2)
                .single();
            if (draftErr || !draft) {
                return failResponse(400, 'Invalid or missing wholesale draft ID.', correlationId, draftErr);
            }
            if (draft.status !== 'pending') {
                return failResponse(400, 'Wholesale draft is not in a pending state.', correlationId);
            }
            canonicalAmountPaise = draft.total_amount_paise;
        } else if (udf1 === 'GOLD_SUBSCRIPTION') {
            // udf2 = packageId (e.g. GOLD_1M, GOLD_3M, GOLD_1Y)
            const plan = GOLD_SUBSCRIPTION_PLANS.find(p => p.key === udf2);
            if (!plan) {
                return failResponse(400, 'Invalid Gold Subscription plan selection.', correlationId);
            }
            canonicalAmountPaise = Math.round(plan.price * 100);
        } else if (udf1 === 'WALLET_TOPUP' || udf1 === 'MERCHANT_TOPUP') {
            // Client-supplied amount — enforce a valid paise range
            const clientPaise = Math.round(Number(orderData.amount) * 100);
            const MIN_PAISE = 100;      // ₹1 minimum
            const MAX_PAISE = 1_00_00_000; // ₹1,00,000 maximum
            if (isNaN(clientPaise) || clientPaise < MIN_PAISE || clientPaise > MAX_PAISE) {
                return failResponse(400, `Invalid topup amount. Must be between ₹${MIN_PAISE / 100} and ₹${MAX_PAISE / 100}.`, correlationId);
            }
            canonicalAmountPaise = clientPaise;
        } else if (udf1 === 'UDHARI_PAYMENT') {
            // udf2 = udhari_requests.id
            const { data: udhariReq, error: udhariErr } = await supabaseAdmin
                .from('udhari_requests')
                .select('amount_paise, fee_paise, status, customer_id')
                .eq('id', udf2)
                .single();
            if (udhariErr || !udhariReq) {
                return failResponse(400, 'Invalid or missing store credit request ID.', correlationId, udhariErr);
            }
            if (udhariReq.status !== 'approved') {
                return failResponse(400, 'Store credit request is not in an approved state.', correlationId);
            }
            if (udhariReq.customer_id !== user.id) {
                return failResponse(403, 'Unauthorized: You do not own this store credit request.', correlationId);
            }
            canonicalAmountPaise = (udhariReq.amount_paise || 0) + (udhariReq.fee_paise || 0);
        } else if (udf1 === 'MERCHANT_LOCKIN' || udf1 === 'MERCHANT_AIGROW') {
            const clientPaise = Math.round(Number(orderData.amount) * 100);
            const MIN_PAISE = 10000 * 100; // Minimum 10,000 INR
            const MAX_PAISE = 1_00_00_000 * 100; // Maximum 1 Crore INR
            if (isNaN(clientPaise) || clientPaise < MIN_PAISE || clientPaise > MAX_PAISE) {
                return failResponse(400, `Invalid investment amount. Minimum is ₹${MIN_PAISE / 100}.`, correlationId);
            }
            canonicalAmountPaise = clientPaise;
        } else {
            return failResponse(400, 'Unsupported payment type.', correlationId, `Unknown udf1 value: "${udf1}"`);
        }

        if (canonicalAmountPaise <= 0 || isNaN(canonicalAmountPaise)) {
            return failResponse(400, 'Invalid payment amount.', correlationId);
        }

        // Override client amount with server-derived canonical amount for gateway encryption
        orderData.amount = (canonicalAmountPaise / 100).toFixed(2);

        // ── Apply Fallback for Topup ──
        if (isTopup) {
            const normalizedPhone = normalizePayerMobile(orderData.payerMobile);
            if (normalizedPhone.length !== 10 || DENIED_PAYER_MOBILES.includes(normalizedPhone)) {
                orderData.payerMobile = WALLET_TOPUP_FALLBACK_MOBILE;
                console.log(`[SabPaisa Initiate][${correlationId}][User:${user.id}] Applied phone fallback for topup.`);
            }
        }

        // ── Persist transaction record ──
        const { error: insertError } = await supabaseAdmin
            .from('transactions')
            .insert({
                client_txn_id: orderData.clientTxnId,
                user_id: user.id,
                amount: Number(orderData.amount),
                expected_amount_paise: canonicalAmountPaise, // Track for callback validation
                status: 'initiated',
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

        // ── Store Session for Safari ITP Recovery ──
        if (refreshToken) {
            // ⚠️ DUAL-USE KEY WARNING ⚠️
            // SUPABASE_SERVICE_ROLE_KEY is used here as BOTH:
            //   (a) The Supabase admin API credential (supabaseAdmin client above)
            //   (b) The AES-256-GCM encryption key for this encrypted_session_data payload
            //
            // ROTATION REQUIREMENT: If this key is rotated, ALL outstanding rows in
            // payment_session_recovery will become UNDECRYPTABLE. Because these rows have
            // a 60-second TTL they expire quickly, but to be safe:
            //   1. Wait for all in-flight payment sessions to expire (~60s) before rotation.
            //   2. Rotate the key in the environment and redeploy.
            //   3. Truncate the payment_session_recovery table after rotation.
            //
            // See: .env.example and ops/runbook.md (SUPABASE_SERVICE_ROLE_KEY section)
            const keyHash = crypto.createHash('sha256').update(process.env.SUPABASE_SERVICE_ROLE_KEY).digest();
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', keyHash, iv);
            const sessionPayload = JSON.stringify({ access_token: token, refresh_token: refreshToken });
            let encrypted = cipher.update(sessionPayload, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag().toString('hex');
            const encryptedSessionData = `${iv.toString('hex')}:${authTag}:${encrypted}`;

            const { error: recoveryError } = await supabaseAdmin
                .from('payment_session_recovery')
                .upsert({
                    txn_id: orderData.clientTxnId,
                    user_id: user.id,
                    encrypted_session_data: encryptedSessionData
                    // recovery_token_hash and token_expires_at will be set during the callback POST
                });
            
            if (recoveryError) {
                console.error(`[SabPaisa Initiate][${correlationId}] Failed to store session recovery data:`, recoveryError);
                // Non-fatal, allow payment to proceed
            }
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
