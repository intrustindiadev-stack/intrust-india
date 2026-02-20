const SABPAISA_CONFIG = {
    // Credentials from Environment Variables
    clientCode: process.env.SABPAISA_CLIENT_CODE ? process.env.SABPAISA_CLIENT_CODE.trim() : '',
    username: process.env.SABPAISA_USERNAME ? process.env.SABPAISA_USERNAME.trim() : '',
    password: process.env.SABPAISA_PASSWORD ? process.env.SABPAISA_PASSWORD.trim() : '',
    authKey: process.env.SABPAISA_AUTH_KEY ? process.env.SABPAISA_AUTH_KEY.trim() : '',
    authIV: process.env.SABPAISA_AUTH_IV ? process.env.SABPAISA_AUTH_IV.trim() : '',

    // URLs - Switch based on environment
    baseUrl: process.env.NODE_ENV === 'production'
        ? 'https://securepay.sabpaisa.in' // Production URL
        : 'https://stage-securepay.sabpaisa.in', // UAT URL (Endpoint appended in client.js)

    // Endpoints
    endpoints: {
        payment: '/SabPaisa/sabPaisaInit?v=1',
        status: '/SabPaisa/sabPaisaTxnStatus',
        refund: '/SabPaisa/sabPaisaRefund'
    },

    // App URLs
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`,

    // Clean string function to remove special chars if needed by gateway
    cleanString: (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '') : ''
};

export default SABPAISA_CONFIG;
