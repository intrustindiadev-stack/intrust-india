import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { submitPaymentForm } from 'sabpaisa-pg-dev';

export const usePayment = () => {
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const initiatePayment = async (paymentDetails) => {
        setLoading(true);
        setError(null);
        setPaymentData(null);

        try {
            // 1. Get Auth Token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('User not authenticated');

            // 2. Call Initiate API to create DB record
            const response = await fetch('/api/payment/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(paymentDetails),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Payment initiation failed');
            }

            // 3. Build form data for Sabpaisa NPM package
            const formData = {
                clientCode: process.env.NEXT_PUBLIC_SABPAISA_CLIENT_CODE,
                transUserName: process.env.NEXT_PUBLIC_SABPAISA_USERNAME,
                transUserPassword: process.env.NEXT_PUBLIC_SABPAISA_PASSWORD,
                authKey: process.env.NEXT_PUBLIC_SABPAISA_AUTH_KEY,
                authIV: process.env.NEXT_PUBLIC_SABPAISA_AUTH_IV,
                callbackUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/payment/callback',
                clientTxnId: data.transactionId,
                payerName: paymentDetails.payerName || 'User',
                payerEmail: paymentDetails.payerEmail || '',
                payerMobile: paymentDetails.payerMobile || '9999999999',
                amount: Number(paymentDetails.amount).toFixed(2),
                channelId: 'W',
                env: process.env.NEXT_PUBLIC_SABPAISA_ENV || 'stag',
            };

            setPaymentData(formData);

            // 4. Submit form via NPM package (encrypts and redirects to Sabpaisa)
            await submitPaymentForm(formData);

        } catch (err) {
            console.error(err);
            setError(err.message);
            setLoading(false);
            throw err;
        }
    };

    return { initiatePayment, loading, error, paymentData };
};
