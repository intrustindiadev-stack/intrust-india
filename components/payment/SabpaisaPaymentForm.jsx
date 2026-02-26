import React from 'react';
import { PaymentForm } from 'sabpaisa-pg-dev';

const REQUIRED_PROPS = ['clientCode', 'transUserName', 'transUserPassword', 'authKey', 'authIV', 'clientTxnId', 'amount'];

const SabpaisaPaymentForm = ({ formData, onResponse }) => {
    const env = process.env.NEXT_PUBLIC_SABPAISA_ENV || 'stag';

    // Guard: ensure required form data is present before rendering the payment form
    if (!formData) {
        console.error('[SabpaisaPaymentForm] formData is null or undefined');
        return <div className="text-red-500 text-sm p-4">Payment form data missing.</div>;
    }

    const missingProps = REQUIRED_PROPS.filter(prop => !formData[prop]);
    if (missingProps.length > 0) {
        console.error('[SabpaisaPaymentForm] Missing required props:', missingProps.join(', '));
        return <div className="text-red-500 text-sm p-4">Payment configuration incomplete. Please try again.</div>;
    }

    return (
        <PaymentForm
            {...formData}
            callbackFunction={onResponse}
            env={env}
        />
    );
};

export default SabpaisaPaymentForm;
