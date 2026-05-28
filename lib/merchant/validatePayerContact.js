import {
    DENIED_PAYER_EMAILS,
    DENIED_PAYER_MOBILES,
    PAYER_EMAIL_REGEX,
    normalizePayerMobile,
} from './payerContactRules';

export function validatePayerContact({ email, phone }, { allowMissingPhone = false } = {}) {
    const errors = {};
    const payerEmail = String(email || '').trim();
    const payerPhone = normalizePayerMobile(phone);

    if (
        !payerEmail ||
        !PAYER_EMAIL_REGEX.test(payerEmail) ||
        DENIED_PAYER_EMAILS.includes(payerEmail.toLowerCase())
    ) {
        errors.email = 'A valid email address is required to process payment.';
    }

    if (allowMissingPhone && payerPhone === '') {
        // Skip phone validation when allowed and phone is completely absent
    } else if (payerPhone.length !== 10 || DENIED_PAYER_MOBILES.includes(payerPhone)) {
        errors.phone = 'A valid mobile number is required to process payment.';
    }

    return {
        ok: Object.keys(errors).length === 0,
        errors,
    };
}
