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

            // 3. Call the new AES-128-CBC initiate API (no auth header needed — server-side only keys)
            const response = await fetch('/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientTxnId,
                    amount: Number(paymentDetails.amount).toFixed(2),
                    payerName: paymentDetails.payerName || 'User',
                    payerEmail: paymentDetails.payerEmail || '',
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
                const errorData = await response.json();
                throw new Error(errorData.error || 'Payment initiation failed');
            }

            // The API now returns an auto-submitting HTML form
            const html = await response.text();

            // Create a temporary container and inject the HTML
            const div = document.createElement('div');
            div.style.display = 'none';
            div.innerHTML = html;
            document.body.appendChild(div);

            // The script in the HTML's onload won't trigger if we just append innerHTML,
            // so we manually submit the form if it exists.
            const form = div.querySelector('form');
            if (form) {
                console.log('[usePayment] Redirecting to SabPaisa Secure Gateway via form submission...');
                form.submit();
            } else {
                throw new Error('Payment form not found in response');
            }


        } catch (err) {
            console.error('[usePayment] Error:', err);
            setError(err.message);
            setLoading(false);
            throw err;
        }
    };

    return { initiatePayment, loading, error, paymentData };
};
