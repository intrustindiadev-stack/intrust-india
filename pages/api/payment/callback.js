import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '../../../lib/supabase/queries';
import { WalletService } from '../../../lib/wallet/walletService';
import { CustomerWalletService } from '../../../lib/wallet/customerWalletService';
import { webcrypto } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Server-side decrypt function compatible with sabpaisa-pg-dev encryption
async function decryptSabpaisaResponse(authKey, authIV, hexCipherText) {
    try {
        const crypto = webcrypto;

        // Base64 to bytes
        const base64ToBytes = (base64) => {
            return Uint8Array.from(Buffer.from(base64, 'base64'));
        };

        // Hex to bytes
        const hexToBytes = (hex) => {
            const bytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < hex.length; i += 2) {
                bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
            }
            return bytes;
        };

        const aesKeyRaw = base64ToBytes(authKey);
        const hmacKeyRaw = base64ToBytes(authIV);
        const fullMessage = hexToBytes(hexCipherText);

        const HMAC_LENGTH = 48;
        const IV_SIZE = 12;
        const TAG_SIZE = 16;

        if (fullMessage.length < HMAC_LENGTH + IV_SIZE + TAG_SIZE) {
            throw new Error("Invalid ciphertext length");
        }

        const hmacReceived = fullMessage.slice(0, HMAC_LENGTH);
        const encryptedData = fullMessage.slice(HMAC_LENGTH);

        const hmacKey = await crypto.subtle.importKey(
            "raw",
            hmacKeyRaw,
            { name: "HMAC", hash: "SHA-384" },
            false,
            ["verify"]
        );

        const isValid = await crypto.subtle.verify("HMAC", hmacKey, hmacReceived, encryptedData);
        if (!isValid) {
            throw new Error("HMAC validation failed");
        }

        const iv = encryptedData.slice(0, IV_SIZE);
        const cipherTextWithTag = encryptedData.slice(IV_SIZE);

        const aesKey = await crypto.subtle.importKey(
            "raw",
            aesKeyRaw,
            "AES-GCM",
            false,
            ["decrypt"]
        );

        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv,
                tagLength: TAG_SIZE * 8,
            },
            aesKey,
            cipherTextWithTag
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        throw error;
    }
}

export default async function handler(req, res) {
    // Accept both GET and POST (Sabpaisa uses GET for redirect with query params)
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('=== SABPAISA CALLBACK RECEIVED ===');
        console.log('Method:', req.method);
        console.log('Query keys:', Object.keys(req.query || {}));
        console.log('Body keys:', Object.keys(req.body || {}));
        const authKeySet = !!(process.env.SABPAISA_AUTH_KEY || process.env.NEXT_PUBLIC_SABPAISA_AUTH_KEY);
        const authIVSet = !!(process.env.SABPAISA_AUTH_IV || process.env.NEXT_PUBLIC_SABPAISA_AUTH_IV);
        console.log('AUTH_KEY set:', authKeySet, '| AUTH_IV set:', authIVSet);

        // Sabpaisa sends encrypted response in 'encResponse' parameter
        // For GET: it's in query params, for POST: it's in body
        let encResponse = req.method === 'GET' ? req.query.encResponse : req.body.encResponse;

        // URL decode if from GET (handles + as space, % encoding etc.)
        if (req.method === 'GET' && encResponse) {
            encResponse = decodeURIComponent(encResponse.replace(/\+/g, ' '));
        }

        if (!encResponse) {
            console.error('Callback received without encResponse', req.method === 'GET' ? req.query : req.body);
            return res.redirect('/payment/failure?reason=invalid_response');
        }

        console.log('encResponse length:', encResponse.length);
        console.log('encResponse preview:', encResponse.substring(0, 40) + '...');

        // 1. Decrypt and Parse
        console.log('Decrypting response...');
        let decryptedString;
        try {
            decryptedString = await decryptSabpaisaResponse(
                process.env.SABPAISA_AUTH_KEY || process.env.NEXT_PUBLIC_SABPAISA_AUTH_KEY,
                process.env.SABPAISA_AUTH_IV || process.env.NEXT_PUBLIC_SABPAISA_AUTH_IV,
                encResponse
            );
        } catch (decryptErr) {
            console.error('=== DECRYPTION FAILED ===');
            console.error('Error:', decryptErr.message);
            const keyUsed = process.env.SABPAISA_AUTH_KEY ? 'SABPAISA_AUTH_KEY' : 'NEXT_PUBLIC_SABPAISA_AUTH_KEY';
            console.error('Key source:', keyUsed);
            console.error('Hint: AUTH_KEY and AUTH_IV must be Base64-encoded strings.');
            throw decryptErr;
        }

        // Strip any stray trailing quote characters from Sabpaisa UAT responses
        const cleanedDecrypted = decryptedString.replace(/"+$/, '').trim();
        console.log('Decrypted data:', cleanedDecrypted);

        // Parse query string response
        const params = new URLSearchParams(cleanedDecrypted);
        const result = {
            clientTxnId: params.get('clientTxnId'),
            sabpaisaTxnId: params.get('sabpaisaTxnId') || params.get('transId'),
            amount: params.get('amount'),
            status: params.get('status'),
            statusCode: params.get('statusCode'),
            paymentMode: params.get('paymentMode'),
            bankName: params.get('bankName'),
            transMsg: params.get('transMsg') || params.get('sabpaisaMessage'),
            bankTxnId: params.get('bankTxnId'),
            rrn: params.get('rrn')
        };

        if (!result.clientTxnId) {
            console.error("Missing clientTxnId in response");
            return res.redirect('/payment/failure?reason=parse_failed');
        }

        const { clientTxnId, sabpaisaTxnId, status, amount, transMsg, bankTxnId, paymentMode } = result;

        // Map status to database enum format (INITIATED, SUCCESS, PENDING, FAILED, ABORTED)
        // Sabpaisa returns: SUCCESS, PENDING, ABORTED, FAILED, etc
        const internalStatus = status === 'SUCCESS' ? 'SUCCESS' :
            status === 'PENDING' ? 'PENDING' :
                status === 'ABORTED' ? 'ABORTED' : 'FAILED';

        // 2. Log Raw Callback
        if (clientTxnId) {
            await logTransactionEvent(clientTxnId, 'CALLBACK', req.method === 'GET' ? req.query : req.body, transMsg || status);
        }

        // 3. Get Existing Transaction to Check Type
        const existingTxn = await getTransactionByClientTxnId(clientTxnId);

        // 4. Update Transaction Status (if it wasn't already SUCCESS)
        // We only want to process rewards/topups ONE TIME.
        const wasAlreadySuccess = existingTxn && existingTxn.status === 'SUCCESS';

        if (clientTxnId) {
            try {
                await updateTransaction(clientTxnId, {
                    status: internalStatus,
                    sabpaisa_txn_id: sabpaisaTxnId,
                    paid_amount: amount,
                    sabpaisa_message: transMsg || status,
                    bank_txn_id: bankTxnId,
                    payment_mode: paymentMode,
                    status_code: result.statusCode || status
                });
                console.log(`Transaction ${clientTxnId} updated to ${internalStatus}`);
            } catch (updateErr) {
                console.error('Failed to update transaction status:', updateErr.message);
                console.error('Status attempted:', internalStatus);
            }
        }

        // 5. Handle Wallet Credit for WALLET_TOPUP safely
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'WALLET_TOPUP') {
            if (!wasAlreadySuccess) {
                try {
                    console.log(`[WALLET_TOPUP] Triggering creditWallet for ${existingTxn.user_id} amount: ${amount}`);
                    await CustomerWalletService.creditWallet(
                        existingTxn.user_id,
                        amount,
                        'TOPUP',
                        `Wallet Topup via Sabpaisa (${paymentMode || 'Gateway'})`,
                        { id: clientTxnId, type: 'TOPUP' }
                    );
                    console.log(`Customer Wallet credited successfully for txn ${clientTxnId}`);
                } catch (walletError) {
                    console.error('Failed to credit customer wallet:', walletError);
                }
            } else {
                console.log(`[WALLET_TOPUP] Transaction ${clientTxnId} was already SUCCESS. Skipping duplicate credit.`);
            }
        }

        // 6. Handle Gold Subscription Success
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'GOLD_SUBSCRIPTION') {
            // Only reward if this is the first time success for this txn
            if (!wasAlreadySuccess) {
                try {
                    console.log(`Processing Gold Subscription for user ${existingTxn.user_id}`);

                    const supabaseAdmin = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL,
                        process.env.SUPABASE_SERVICE_ROLE_KEY
                    );

                    // A. Fetch current profile to check existing expiry
                    const { data: profile } = await supabaseAdmin
                        .from('user_profiles')
                        .select('is_gold_verified, subscription_expiry')
                        .eq('id', existingTxn.user_id)
                        .single();

                    // B. Determine Package Details
                    const packageId = existingTxn.udf2 || 'GOLD_1Y';
                    let monthsToAdd = 12;
                    let cashbackAmount = 1499.00;

                    if (packageId === 'GOLD_1M') {
                        monthsToAdd = 1;
                        cashbackAmount = 199.00;
                    } else if (packageId === 'GOLD_3M') {
                        monthsToAdd = 3;
                        cashbackAmount = 499.00;
                    } else if (packageId === 'GOLD_1Y') {
                        monthsToAdd = 12;
                        cashbackAmount = 1499.00;
                    }

                    // C. Calculate New Expiry Date
                    // If already gold and expiry is in future, EXTEND it.
                    // Otherwise, start from now.
                    let baseDate = new Date();
                    if (profile?.is_gold_verified && profile?.subscription_expiry) {
                        const currentExpiry = new Date(profile.subscription_expiry);
                        if (currentExpiry > baseDate) {
                            baseDate = currentExpiry;
                        }
                    }

                    const newExpiryDate = new Date(baseDate);
                    newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

                    // D. Update User Profile
                    const { error: profileError } = await supabaseAdmin
                        .from('user_profiles')
                        .update({
                            is_gold_verified: true,
                            subscription_expiry: newExpiryDate.toISOString(),
                            updated_at: new Date()
                        })
                        .eq('id', existingTxn.user_id);

                    if (profileError) throw profileError;

                    // E. Credit Cashback to Customer Wallet
                    await CustomerWalletService.creditWallet(
                        existingTxn.user_id,
                        cashbackAmount,
                        'CASHBACK',
                        `Gold ${monthsToAdd}M Subscription Cashback Reward`,
                        { id: clientTxnId, type: 'SUBSCRIPTION', package: packageId }
                    );
                } catch (goldError) {
                    console.error('Failed to process gold subscription rewards:', goldError);
                }
            }
        }

        // 6. Redirect User based on Status
        if (internalStatus === 'SUCCESS') {
            res.redirect(`/payment/success?txnId=${clientTxnId}`);
        } else if (internalStatus === 'PENDING') {
            res.redirect(`/payment/processing?txnId=${clientTxnId}`);
        } else {
            res.redirect(`/payment/failure?txnId=${clientTxnId}&msg=${encodeURIComponent(transMsg || 'Payment Failed')}`);
        }

    } catch (error) {
        console.error('Payment Callback Error:', error);
        res.redirect('/payment/failure?reason=internal_error');
    }
}
