export const PAYER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DENIED_PAYER_EMAILS = [
    'merchant@example.com',
    'example.com',
    'test@test.com',
];

export const DENIED_PAYER_MOBILES = [
    '9999999999',
    '0000000000',
    '1111111111',
    '2222222222',
    '3333333333',
    '4444444444',
    '5555555555',
    '6666666666',
    '7777777777',
    '8888888888',
];

export function normalizePayerMobile(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
}
