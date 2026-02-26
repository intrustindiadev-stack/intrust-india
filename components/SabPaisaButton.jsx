'use client';

import { useState } from 'react';

export default function SabPaisaButton({
    amount,
    clientTxnId,
    payerName,
    payerEmail,
    payerMobile,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handlePayment = async () => {
        setLoading(true);
        setError(null);

        try {
            // 1. Call your own API to generate the encrypted payload and get the SabPaisa URL
            const response = await fetch('/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount,
                    clientTxnId,
                    payerName,
                    payerEmail,
                    payerMobile,
                    udf1,
                    udf2,
                    udf3,
                    udf4,
                    udf5
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initiate payment');
            }

            if (!data.encData || !data.paymentUrl || !data.clientCode) {
                throw new Error('Invalid response from payment server');
            }

            // 2. Build a hidden HTML form dynamically and submit it to SabPaisa
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = data.paymentUrl;

            // SabPaisa Legacy Spec explicitly expects 'encData' and 'clientCode'
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

            console.log('Redirecting to SabPaisa Secure Gateway...');

            // 3. Submit form redirecting user to SabPaisa
            form.submit();

        } catch (err) {
            console.error('Payment Error:', err);
            setError(err.message || 'Payment processing failed');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-start gap-2">
            {error && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm">
                    {error}
                </div>
            )}

            <button
                onClick={handlePayment}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px]"
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                    </span>
                ) : (
                    `Pay ₹${Number(amount || 0).toFixed(2)}`
                )}
            </button>
        </div>
    );
}
