/**
 * Diagnostic endpoint to verify Sabpaisa env var configuration.
 * Visit /api/payment/diagnose to check if credentials are correctly set.
 * 
 * IMPORTANT: Remove or protect this endpoint before going to production.
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const results = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        checks: {}
    };

    // Check each required env var
    const envVars = [
        'NEXT_PUBLIC_SABPAISA_CLIENT_CODE',
        'NEXT_PUBLIC_SABPAISA_USERNAME',
        'NEXT_PUBLIC_SABPAISA_PASSWORD',
        'NEXT_PUBLIC_SABPAISA_AUTH_KEY',
        'NEXT_PUBLIC_SABPAISA_AUTH_IV',
        'NEXT_PUBLIC_SABPAISA_ENV',
        'NEXT_PUBLIC_SABPAISA_INIT_URL',
        'NEXT_PUBLIC_APP_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_SUPABASE_URL',
    ];

    for (const varName of envVars) {
        const value = process.env[varName];
        const isSet = !!value && value.length > 0;

        results.checks[varName] = {
            set: isSet,
            length: isSet ? value.length : 0,
            preview: isSet ? value.substring(0, 8) + '...' : null,
        };
    }

    // Check if AUTH_KEY and AUTH_IV are valid Base64
    const authKey = process.env.NEXT_PUBLIC_SABPAISA_AUTH_KEY;
    const authIV = process.env.NEXT_PUBLIC_SABPAISA_AUTH_IV;

    results.base64Validation = {};

    if (authKey) {
        try {
            const decoded = Buffer.from(authKey, 'base64');
            const reEncoded = decoded.toString('base64');
            const isValidBase64 = reEncoded === authKey || authKey.endsWith('=') || authKey.endsWith('==');
            results.base64Validation.AUTH_KEY = {
                isValidBase64,
                decodedLength: decoded.length,
                note: decoded.length === 32 ? '✅ 32 bytes (AES-256 compatible)' :
                    decoded.length === 16 ? '⚠️ 16 bytes (AES-128, may not work)' :
                        `❌ ${decoded.length} bytes (unexpected length)`
            };
        } catch {
            results.base64Validation.AUTH_KEY = { isValidBase64: false, error: 'Not valid base64' };
        }
    } else {
        results.base64Validation.AUTH_KEY = { isValidBase64: false, error: 'Not set' };
    }

    if (authIV) {
        try {
            const decoded = Buffer.from(authIV, 'base64');
            const reEncoded = decoded.toString('base64');
            const isValidBase64 = reEncoded === authIV || authIV.endsWith('=') || authIV.endsWith('==');
            results.base64Validation.AUTH_IV = {
                isValidBase64,
                decodedLength: decoded.length,
                note: decoded.length === 32 ? '✅ 32 bytes (HMAC-SHA384 compatible)' :
                    `⚠️ ${decoded.length} bytes`
            };
        } catch {
            results.base64Validation.AUTH_IV = { isValidBase64: false, error: 'Not valid base64' };
        }
    } else {
        results.base64Validation.AUTH_IV = { isValidBase64: false, error: 'Not set' };
    }

    // Overall status
    const allSet = envVars.every(v => results.checks[v]?.set);
    const keysAreBase64 = results.base64Validation.AUTH_KEY?.isValidBase64 &&
        results.base64Validation.AUTH_IV?.isValidBase64;

    results.summary = {
        allEnvVarsSet: allSet,
        keysAreBase64,
        callbackUrl: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`
            : '❌ NEXT_PUBLIC_APP_URL not set',
        readyForPayment: allSet && keysAreBase64,
        verdict: allSet && keysAreBase64
            ? '✅ Configuration looks correct'
            : !allSet
                ? '❌ Some env vars are missing'
                : '❌ AUTH_KEY/AUTH_IV must be Base64-encoded strings'
    };

    return res.status(200).json(results);
}
