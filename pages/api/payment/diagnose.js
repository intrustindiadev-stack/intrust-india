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

    // Check if AUTH_KEY and AUTH_IV are compatible with GCM (16 or 32 chars)
    const authKey = process.env.NEXT_PUBLIC_SABPAISA_AUTH_KEY;
    const authIV = process.env.NEXT_PUBLIC_SABPAISA_AUTH_IV;

    results.keyValidation = {};

    if (authKey) {
        results.keyValidation.AUTH_KEY = {
            length: authKey.length,
            note: authKey.length === 32 ? '✅ 32 chars (AES-256-GCM)' :
                authKey.length === 16 ? '✅ 16 chars (AES-128-GCM)' :
                    `⚠️ ${authKey.length} chars`
        };
    }

    if (authIV) {
        results.keyValidation.AUTH_IV = {
            length: authIV.length,
            note: '✅ Used as HMAC-SHA384 Key'
        };
    }

    // Overall status
    const allSet = envVars.every(v => results.checks[v]?.set);

    results.summary = {
        allEnvVarsSet: allSet,
        encryptionProtocol: 'Integration Kit 2.0 (GCM + HMAC)',
        callbackUrl: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`
            : '❌ NEXT_PUBLIC_APP_URL not set',
        readyForPayment: allSet,
        verdict: allSet
            ? '✅ Configuration looks correct for GCM+HMAC'
            : '❌ Some env vars are missing'
    };

    return res.status(200).json(results);
}
