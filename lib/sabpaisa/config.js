export const sabpaisaConfig = {
    clientCode: process.env.SABPAISA_CLIENT_CODE || '',
    username: process.env.SABPAISA_USERNAME || '',
    password: process.env.SABPAISA_PASSWORD || '',
    authKey: process.env.SABPAISA_AUTH_KEY || '',
    authIV: process.env.SABPAISA_AUTH_IV || '',
    initUrl: process.env.SABPAISA_INIT_URL || 'https://securepay.sabpaisa.in/SabPaisa/sabPaisaInit?v=1',
    callbackUrl: process.env.SABPAISA_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sabpaisa/callback`
};
