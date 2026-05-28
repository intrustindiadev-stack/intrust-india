import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { normalizePayerMobile } from '@/lib/merchant/payerContactRules';
import { validatePayerContact } from '@/lib/merchant/validatePayerContact';
import { isTopupUdf1, WALLET_TOPUP_FALLBACK_MOBILE } from '@/lib/sabpaisa/topupFallback';

export class PayerContactError extends Error {
    constructor({ field, message }) {
        super(message || 'A valid payer contact is required to process payment.');
        this.name = 'PayerContactError';
        this.code = 'INVALID_PAYER_CONTACT';
        this.field = field;
    }
}

export function fieldFromPayerContactError(field) {
    if (field === 'payerEmail') return 'email';
    if (field === 'payerMobile') return 'phone';
    return field === 'email' || field === 'phone' ? field : null;
}

export const usePayment = () => {
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const initiatePayment = async (paymentDetails) => {
        setLoading(true);
        setError(null);
        setPaymentData(null);

        try {
            // 1. Get Auth Token (to include user info if needed by backend)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('User not authenticated');

            // 2. Generate a unique clientTxnId for this transaction
            const clientTxnId = `WLT_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
            const payerEmail = String(paymentDetails.payerEmail || '').trim();
            let payerMobile = normalizePayerMobile(paymentDetails.payerMobile).slice(-10);
            
            const isTopup = isTopupUdf1(paymentDetails.udf1 || 'WALLET_TOPUP');
            const payerValidation = validatePayerContact(
                { email: payerEmail, phone: payerMobile },
                { allowMissingPhone: isTopup }
            );

            if (payerValidation.errors.email) {
                throw new PayerContactError({ field: 'email', message: payerValidation.errors.email });
            }
            if (payerValidation.errors.phone) {
                if (!isTopup) {
                    throw new PayerContactError({ field: 'phone', message: payerValidation.errors.phone });
                } else {
                    payerMobile = WALLET_TOPUP_FALLBACK_MOBILE;
                }
            }

            // 3. Call the new AES-128-CBC initiate API and persist transaction
            const response = await fetch('/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    clientTxnId,
                    amount: Number(paymentDetails.amount).toFixed(2),
                    payerName: paymentDetails.payerName || 'User',
                    payerEmail,
                    payerMobile,
                    udf1: paymentDetails.udf1 || 'WALLET_TOPUP',
                    udf2: paymentDetails.udf2 || '',
                    udf3: paymentDetails.udf3 || '',
                    udf4: paymentDetails.udf4 || '',
                    udf5: paymentDetails.udf5 || '',
                }),
            });

            if (!response.ok) {
                // Content-type-aware error parsing: server may return HTML on fatal errors.
                const contentType = response.headers.get('content-type') || '';
                let userMessage = 'Payment initiation failed. Please try again.';
                let correlationId = null;
                if (contentType.includes('application/json')) {
                    try {
                        const errorData = await response.json();
                        if (errorData.error === 'INVALID_PAYER_CONTACT') {
                            throw new PayerContactError({
                                field: fieldFromPayerContactError(errorData.field),
                                message: errorData.message || userMessage,
                            });
                        }
                        userMessage = errorData.message || errorData.error || userMessage;
                        correlationId = errorData.correlationId || null;
                    } catch (parseErr) {
                        if (parseErr instanceof PayerContactError) throw parseErr;
                        // JSON parse failed despite content-type header — fall through to generic message
                        console.error('[usePayment] Failed to parse error JSON:', parseErr);
                    }
                } else {
                    // Non-JSON body (e.g. HTML error page) — log raw for support, show stable message
                    const rawText = await response.text().catch(() => '[unreadable]');
                    console.error('[usePayment] Non-JSON error response from /api/sabpaisa/initiate:', rawText);
                }
                if (correlationId) {
                    console.error(`[usePayment] Server correlationId: ${correlationId}`);
                }
                throw new Error(userMessage);
            }

            // The API now returns JSON data to securely build the form
            const data = await response.json();

            if (!data.encData || !data.paymentUrl || !data.clientCode) {
                throw new Error('Invalid response from payment server');
            }

            console.log('[usePayment] Redirecting to SabPaisa Secure Gateway via secure form...');

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.paymentUrl;

            const encDataInput = document.createElement('input');
            encDataInput.type = 'hidden';
            encDataInput.name = 'encData';
            encDataInput.value = data.encData;
            form.appendChild(encDataInput);

            const clientCodeInput = document.createElement('input');
            clientCodeInput.type = 'hidden';
            clientCodeInput.name = 'clientCode';
            clientCodeInput.value = data.clientCode;
            form.appendChild(clientCodeInput);

            document.body.appendChild(form);
            form.submit();


        } catch (err) {
            console.error('[usePayment] Error:', err);
            setError(err.message);
            setLoading(false);
            throw err;
        }
    };

    return { initiatePayment, loading, error, paymentData };
};
