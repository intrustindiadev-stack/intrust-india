import React from 'react';
import { PaymentForm } from 'sabpaisa-pg-dev';

const SabpaisaPaymentForm = ({ formData, onResponse }) => {
    // Determine environment based on config, default to 'stag'
    // Note: The package usually expects 'stag' or 'prod'.
    const env = process.env.NEXT_PUBLIC_SABPAISA_ENV || 'stag';

    return (
        <PaymentForm
            {...formData}
            callbackFunction={onResponse}
            env={env}
        />
    );
};

export default SabpaisaPaymentForm;
