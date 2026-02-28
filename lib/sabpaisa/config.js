const validateConfig = (config) => {
    const { authKey, authIV, clientCode, username, password } = config;
    if (!clientCode || !username || !password) {
        console.error('🔴 Missing SabPaisa credentials (clientCode, username, or password)');
    }
    if (!authKey || !authIV) {
        console.error('🔴 Missing SabPaisa encryption keys (authKey or authIV)');
    }
};

export const sabpaisaConfig = {
    clientCode: (process.env.SABPAISA_CLIENT_CODE || '').trim(),
    username: (process.env.SABPAISA_USERNAME || '').trim(),
    password: (process.env.SABPAISA_PASSWORD || '').trim(),
    authKey: (process.env.SABPAISA_AUTH_KEY || '').trim(),
    authIV: (process.env.SABPAISA_AUTH_IV || '').trim(),
    initUrl: (process.env.SABPAISA_INIT_URL || 'https://securepay.sabpaisa.in/SabPaisa/sabPaisaInit?v=1').trim(),
    callbackUrl: (process.env.SABPAISA_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sabpaisa/callback`).trim()
};

validateConfig(sabpaisaConfig);
