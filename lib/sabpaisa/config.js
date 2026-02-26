const SABPAISA_CONFIG = {
    // Server-side credentials — NEVER use NEXT_PUBLIC_ for these
    clientCode: (process.env.SABPAISA_CLIENT_CODE || '').trim(),
    username: (process.env.SABPAISA_USERNAME || '').trim(),
    password: (process.env.SABPAISA_PASSWORD || '').trim(),
    authKey: (process.env.SABPAISA_AUTH_KEY || '').trim(),
    authIV: (process.env.SABPAISA_AUTH_IV || '').trim(),

    // MCC — Merchant Category Code (configurable per merchant)
    mcc: (process.env.SABPAISA_MCC || '6012').trim(),

    // URLs - Switch based on environment
    baseUrl: process.env.NODE_ENV === 'production'
        ? 'https://securepay.sabpaisa.in'
        : 'https://stage-securepay.sabpaisa.in',

    // Endpoints
    endpoints: {
        payment: '/SabPaisa/sabPaisaInit?v=1',
        status: '/SabPaisa/sabPaisaTxnStatus',
        refund: '/SabPaisa/sabPaisaRefund'
    },

    // App URLs
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`,
};

export default SABPAISA_CONFIG;
