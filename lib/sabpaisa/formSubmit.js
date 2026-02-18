/**
 * Submits payment form to Sabpaisa payment gateway
 * This function handles the redirect properly by:
 * 1. Creating a real HTML form (not React form)
 * 2. Appending to body
 * 3. Submitting with native browser behavior
 */
export function submitPaymentForm(paymentData, actionUrl) {
    console.log('=== SABPAISA FORM SUBMISSION START ===');
    console.log('Action URL:', actionUrl);
    console.log('Payment Data:', paymentData);

    // Validate action URL
    if (!actionUrl || !actionUrl.startsWith('http')) {
        console.error('Invalid action URL:', actionUrl);
        throw new Error('Invalid payment gateway URL');
    }

    // Validate required fields for OUR integration (Encrypted Flow)
    // We expect 'encData' (or 'bcKey') and 'clientCode'.
    // We do NOT check for password/username here as they should stay on backend.
    if (!paymentData.encData && !paymentData.bcKey) {
        console.warn('Warning: Missing encData/bcKey in payment data. This might fail if using encrypted flow.');
    }
    if (!paymentData.clientCode) {
        console.warn('Warning: Missing clientCode in payment data.');
    }

    try {
        // Remove any existing Sabpaisa forms to prevent duplicates
        const existingForms = document.querySelectorAll('form[data-sabpaisa-form]');
        existingForms.forEach(form => form.remove());

        // Create fresh form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = actionUrl;
        form.setAttribute('data-sabpaisa-form', 'true');
        // form.target = '_self'; // Default behavior, explicit is fine too

        // Add all fields
        Object.keys(paymentData).forEach((key) => {
            const value = paymentData[key];

            // Skip internal fields or undefined
            if (key === 'url' || key === 'transactionId' || value === undefined || value === null) {
                return;
            }

            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(value);
            form.appendChild(input);

            // Log safe version
            const logValue = String(value).length > 50 ? String(value).substring(0, 50) + '...' : String(value);
            console.log(`✓ Added field: ${key} = ${logValue}`);
        });

        // Append form to body
        document.body.appendChild(form);
        console.log('✓ Form appended to body');

        // Log full form for debugging
        console.log('Form action:', form.action);

        // Submit form - Use setTimeout to ensure DOM is ready
        console.log('⏳ Submitting form in 100ms...');

        setTimeout(() => {
            try {
                console.log('🚀 Form.submit() called');
                form.submit();
                console.log('✓ Form submitted successfully');
            } catch (submitError) {
                console.error('❌ Form submit error:', submitError);
                // Fallback: Try straight submit again without try/catch wrapper if somehow that interferes (unlikely)
                form.submit();
            }
        }, 100);

        // Safety Fallback check
        // Safety Fallback check
        // We do NOT auto-redirect via GET anymore as Sabpaisa requires POST.
        // We rely on the UI "Pay Now" button to handle stuck cases manually via POST.
        console.log('⏳ Waiting for generic form submission...');

        return true;

    } catch (error) {
        console.error('❌ Form creation error:', error);
        throw error;
    }
}
