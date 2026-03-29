import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
                    payerEmail: paymentDetails.payerEmail || 'guest@sabpaisa.in',
                    payerMobile: paymentDetails.payerMobile
                        ? paymentDetails.payerMobile.replace(/\D/g, '').replace(/^91/, '').slice(-10)
                        : '9999999999',
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
                        userMessage = errorData.error || userMessage;
                        correlationId = errorData.correlationId || null;
                    } catch (parseErr) {
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
