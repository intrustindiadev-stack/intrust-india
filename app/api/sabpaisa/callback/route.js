import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/sabpaisa/encryption';
import { createClient } from '@supabase/supabase-js';
import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '@/lib/supabase/queries';
import { CustomerWalletService } from '@/lib/wallet/customerWalletService';
import { mapStatusToInternal } from '@/lib/sabpaisa/utils';
import { sabpaisaConfig } from '@/lib/sabpaisa/config';

const ALLOWED_IPS = (process.env.SABPAISA_ALLOWED_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);

export async function GET() {
    console.warn('[SabPaisa] Suspicious GET request to callback URL');
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export async function POST(request) {
    // 1. IP Whitelisting (Optional but highly recommended)
    if (ALLOWED_IPS.length > 0) {
        let clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';

        if (!ALLOWED_IPS.includes(clientIp)) {
            console.error(`[SabPaisa] Blocked unauthorized callback from IP: ${clientIp}`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    }

    try {
        // SabPaisa sends the response back via a POST form submission
        const formData = await request.formData();
        const encResponse = formData.get('encResponse');

        if (!encResponse) {
            return NextResponse.json(
                { error: 'No encrypted response received from SabPaisa' },
                { status: 400 }
            );
        }

        // Decrypt the response using our internal Sabpaisa Kit 2.0 GCM decryption 
        // to guarantee server-side compatibility (SDK uses window.location.search)
        const { authKey, authIV } = sabpaisaConfig;

        // SDK string replaces space with '+', make sure our input is clean
        const cleanEncResponse = encResponse.replaceAll(' ', '+');

        const decryptedString = decrypt(cleanEncResponse, authKey, authIV);

        if (!decryptedString) {
            return NextResponse.json(
                { error: 'Failed to decrypt the SabPaisa response' },
                { status: 400 }
            );
        }

        // The decrypted string is URL-encoded query parameters
        const params = new URLSearchParams(decryptedString);
        const result = Object.fromEntries(params.entries());

        // LOGGING: Sanitize output to remove PII (email, mobile, address, etc.)
        const sanitizedResult = { ...result };
        ['payerEmail', 'payerMobile', 'payerAddress', 'payerName', 'transUserPassword'].forEach(key => {
            if (sanitizedResult[key]) sanitizedResult[key] = '***';
        });

        console.log('SabPaisa Callback Decrypted Data (Sanitized):', sanitizedResult);

        const clientTxnId = result.clientTxnId;
        const status = result.status || result.statusCode; // SUCCESS, FAILED, ABORTED, etc.
        const sabpaisaTxnId = result.sabpaisaTxnId || result.transId;
        const amount = result.amount;

        // Map status to internal enum
        const internalStatus = mapStatusToInternal(result.statusCode || status);
        console.log(`[Callback] txn=${clientTxnId} status=${internalStatus} amount=${amount}`);

        // 2. Log Callback
        if (clientTxnId) {
            await logTransactionEvent(clientTxnId, 'CALLBACK', {
                statusCode: result.statusCode,
                status: result.status,
                paymentMode: result.paymentMode,
                bankTxnId: result.bankTxnId,
                sabpaisaTxnId: sabpaisaTxnId
            }, result.transMsg || status);
        }

        // 3. Get Existing Transaction to Check Type
        const existingTxn = await getTransactionByClientTxnId(clientTxnId);
        const wasAlreadySuccess = existingTxn && existingTxn.status === 'SUCCESS';

        // 4. Update Transaction Status (if it wasn't already SUCCESS)
        if (clientTxnId) {
            try {
                await updateTransaction(clientTxnId, {
                    status: internalStatus,
                    sabpaisa_txn_id: sabpaisaTxnId,
                    paid_amount: amount,
                    sabpaisa_message: result.transMsg || status,
                    bank_txn_id: result.bankTxnId,
                    payment_mode: result.paymentMode,
                    status_code: result.statusCode || status
                });
            } catch (updateErr) {
                console.error('[Callback] Failed to update transaction:', updateErr.message);
            }
        }

        // 5. Handle Wallet Credit for WALLET_TOPUP safely
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'WALLET_TOPUP' && !wasAlreadySuccess) {
            try {
                await CustomerWalletService.creditWallet(
                    existingTxn.user_id,
                    amount,
                    'TOPUP',
                    `Wallet Topup via Sabpaisa (${result.paymentMode || 'Gateway'})`,
                    { id: clientTxnId, type: 'TOPUP' }
                );
                console.log(`[Callback] Wallet credited for txn ${clientTxnId}`);
            } catch (walletError) {
                console.error('[Callback] Failed to credit wallet:', walletError.message);
            }
        }

        // 6. Handle Gift Card Purchase — Atomic coupon+order with rollback safety
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'GIFT_CARD' && !wasAlreadySuccess) {
            try {
                const couponId = existingTxn.udf2;
                if (couponId) {
                    const supabaseAdmin = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL,
                        process.env.SUPABASE_SERVICE_ROLE_KEY
                    );

                    // Step A: Mark coupon as sold (only if still available)
                    const { data: updatedCoupon, error: updateCouponError } = await supabaseAdmin
                        .from('coupons')
                        .update({
                            status: 'sold',
                            purchased_by: existingTxn.user_id,
                            purchased_at: new Date().toISOString()
                        })
                        .eq('id', couponId)
                        .eq('status', 'available')
                        .select('id')
                        .single();

                    if (!updateCouponError && updatedCoupon) {
                        // Step B: Create order record
                        const amountPaise = Math.round(parseFloat(amount) * 100);
                        const { error: orderError } = await supabaseAdmin
                            .from('orders')
                            .insert({
                                user_id: existingTxn.user_id,
                                giftcard_id: couponId,
                                amount: amountPaise,
                                payment_status: 'paid',
                                created_at: new Date().toISOString()
                            });

                        if (orderError) {
                            console.error('[Callback] Order insert failed, rolling back coupon:', orderError.message);
                            await supabaseAdmin
                                .from('coupons')
                                .update({ status: 'available', purchased_by: null, purchased_at: null })
                                .eq('id', couponId)
                                .eq('purchased_by', existingTxn.user_id);
                        } else {
                            console.log(`[Callback] Gift card order created for coupon ${couponId}`);
                        }
                    }
                }
            } catch (gcError) {
                console.error('[Callback] Gift card processing error:', gcError.message);
            }
        }

        // 7. Redirect User based on Status
        let redirectPath = '/payment/failure';
        let redirectQuery = `?txnId=${clientTxnId}&msg=${encodeURIComponent(result.transMsg || 'Payment Failed')}`;

        if (internalStatus === 'SUCCESS') {
            redirectPath = '/payment/success';
            redirectQuery = `?txnId=${clientTxnId}`;
        } else if (internalStatus === 'PENDING') {
            redirectPath = '/payment/processing';
            redirectQuery = `?txnId=${clientTxnId}`;
        }

        const redirectUrl = new URL(redirectPath + redirectQuery, request.url);
        return NextResponse.redirect(redirectUrl, 303);

    } catch (error) {
        console.error('API Callback Error:', error);

        // Final fallback redirect in case of fatal error
        const fatalUrl = new URL('/payment/failure?reason=internal_error', request.url);
        return NextResponse.redirect(fatalUrl, 303);
    }
}
