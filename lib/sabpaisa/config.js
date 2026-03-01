const validateConfig = (config) => {
    const { authKey, authIV, clientCode, username, password } = config;
    if (!clientCode || !username || !password) {
        console.error('🔴 Missing SabPaisa credentials. Check SABPAISA_CLIENT_CODE, SABPAISA_USERNAME, SABPAISA_PASSWORD in .env.local');
    }
    if (!authKey || !authIV) {
        console.error('🔴 Missing SabPaisa encryption keys. Check SABPAISA_AUTH_KEY and SABPAISA_AUTH_IV in .env.local');
    } else {
        console.log('✅ SabPaisa config loaded. clientCode:', clientCode, '| authKey length:', authKey.length);
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