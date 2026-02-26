import { sabpaisaConfig } from './config';
import { encrypt } from './encrypt';

// Required .env.local variables:
// SABPAISA_CLIENT_CODE, SABPAISA_USERNAME, SABPAISA_PASSWORD,
// SABPAISA_AUTH_KEY, SABPAISA_AUTH_IV, SABPAISA_CALLBACK_URL,
// SABPAISA_INIT_URL

export function buildEncryptedPayload(orderData) {
    // Build the payload following the official SabPaisa spec
    // Field order matches the official documentation exactly
    const payloadFields = {
        clientCode: sabpaisaConfig.clientCode,
        transUserName: sabpaisaConfig.username,
        transUserPassword: sabpaisaConfig.password,
        authKey: sabpaisaConfig.authKey,
        authIV: sabpaisaConfig.authIV,
        callbackUrl: sabpaisaConfig.callbackUrl,
        clientTxnId: orderData.clientTxnId,
        payerName: orderData.payerName || 'User',
        payerEmail: orderData.payerEmail || '',
        payerMobile: orderData.payerMobile || '9999999999',
        amount: Number(orderData.amount).toFixed(2),
        channelId: 'W',        // 'W' = Web
        amountType: orderData.amountType || 'INR',
        udf1: orderData.udf1 || '',
        udf2: orderData.udf2 || '',
        udf3: orderData.udf3 || '',
        udf4: orderData.udf4 || '',
        udf5: orderData.udf5 || '',
    };

    // URLSearchParams gives us properly percent-encoded query string
    const queryStr = new URLSearchParams(payloadFields).toString();

    // Encrypt using AES-128-CBC → Base64 (server-side, Node.js crypto)
    const encData = encrypt(queryStr);

    return encData;
}
