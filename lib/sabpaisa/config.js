const isProd = process.env.NODE_ENV === 'production';

const validateConfig = (config) => {
    const { authKey, authIV, clientCode, username, password } = config;
    if (!clientCode || !username || !password) {
        console.error('🔴 [SabPaisa] Missing credentials. Check SABPAISA_CLIENT_CODE, SABPAISA_USERNAME, SABPAISA_PASSWORD in env.');
    }
    if (!authKey || !authIV) {
        console.error('🔴 [SabPaisa] Missing encryption keys. Check SABPAISA_AUTH_KEY and SABPAISA_AUTH_IV in env.');
    } else {
        console.log('[SabPaisa] Config loaded. clientCode:', clientCode, '| authKey length:', authKey.length);
    }

    if (isProd) {
        if (!config.callbackUrl || !config.callbackUrl.startsWith('https://')) {
            console.error(
                '🔴 [SabPaisa] PRODUCTION: callbackUrl is missing or not HTTPS. ' +
                'Set SABPAISA_CALLBACK_URL or NEXT_PUBLIC_APP_URL to an explicit HTTPS origin.'
            );
        }
    }
};

/**
 * Returns null if callback URL is valid, or an error string if not.
 * Used by the initiate route to fail-fast in production.
 */
export function validateCallbackConfig() {
    const url = sabpaisaConfig.callbackUrl;
    if (!url) return 'Callback URL is not configured.';
    if (isProd && !url.startsWith('https://')) {
        return `Callback URL must be HTTPS in production. Received: ${url.substring(0, 20)}...`;
    }
    return null;
}

// Resolve callback URL — no permissive localhost fallback in production.
function resolveCallbackUrl() {
    if (process.env.SABPAISA_CALLBACK_URL) {
        return process.env.SABPAISA_CALLBACK_URL.trim();
    }
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
    if (appUrl) {
        return `${appUrl}/api/sabpaisa/callback`;
    }
    // Only allow localhost fallback in non-production environments.
    if (!isProd) {
        return 'http://localhost:3000/api/sabpaisa/callback';
    }
    // In production with no explicit config, return empty so validation catches it.
    return '';
}

export const sabpaisaConfig = {
    clientCode: (process.env.SABPAISA_CLIENT_CODE || '').trim(),
    username: (process.env.SABPAISA_USERNAME || '').trim(),
    password: (process.env.SABPAISA_PASSWORD || '').trim(),
    authKey: (process.env.SABPAISA_AUTH_KEY || '').trim(),
    authIV: (process.env.SABPAISA_AUTH_IV || '').trim(),
    initUrl: (process.env.SABPAISA_INIT_URL || 'https://securepay.sabpaisa.in/SabPaisa/sabPaisaInit?v=1').trim(),
    callbackUrl: resolveCallbackUrl(),
    baseUrl: 'https://securepay.sabpaisa.in',
    endpoints: {
        payment: '/SabPaisa/sabPaisaInit?v=1',
        status: '/SabPaisa/statusApi'
    }
};

validateConfig(sabpaisaConfig);