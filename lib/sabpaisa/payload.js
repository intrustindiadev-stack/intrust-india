import { sabpaisaConfig } from './config';
import { encrypt } from './encrypt';

/**
 * Builds the legacy SabPaisa payload for AES-128-CBC
 * Includes only the 10 mandatory fields as per legacy documentation.
 */
export function buildEncryptedPayload(orderData) {
    const payloadFields = {
        payerName: orderData.payerName || 'User',
        payerEmail: orderData.payerEmail || 'NA',
        payerMobile: orderData.payerMobile || '9999999999',
        clientTxnId: orderData.clientTxnId,
        amount: Number(orderData.amount).toFixed(2), // Force "1.00" format
        clientCode: sabpaisaConfig.clientCode,
        transUserName: sabpaisaConfig.username,
        transUserPassword: sabpaisaConfig.password,
        callbackUrl: sabpaisaConfig.callbackUrl,
        channelId: 'W',
        udf1: orderData.udf1 || '',
        udf2: orderData.udf2 || '',
        udf3: orderData.udf3 || '',
        udf4: orderData.udf4 || '',
        udf5: orderData.udf5 || '',
    };

    // Use URLSearchParams for standard encoding
    const queryStr = new URLSearchParams(payloadFields).toString();

    // Encrypt the resulting string
    const encData = encrypt(queryStr);

    return encData;
}
