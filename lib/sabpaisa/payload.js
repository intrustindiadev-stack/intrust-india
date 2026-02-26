import { sabpaisaConfig } from './config';
import { encrypt } from './encrypt';

export function buildEncryptedPayload(orderData) {
    // SabPaisa strictly requires these field names in the query string payload
    const payloadFields = {
        payerName: orderData.payerName || 'User',
        payerEmail: orderData.payerEmail || 'user@example.com',
        payerMobile: orderData.payerMobile || '9999999999',
        clientTxnId: orderData.clientTxnId,
        amount: Number(orderData.amount).toFixed(2), // Must be "XX.XX"
        clientCode: sabpaisaConfig.clientCode,
        transUserName: sabpaisaConfig.username,
        transUserPassword: sabpaisaConfig.password,
        callbackUrl: sabpaisaConfig.callbackUrl,
        channelId: 'W', // W for Web
        amountType: orderData.amountType || 'INR',
        programId: orderData.programId || '',
        mcc: orderData.mcc || '6012',
        udf1: orderData.udf1 || '',
        udf2: orderData.udf2 || '',
        udf3: orderData.udf3 || '',
        udf4: orderData.udf4 || '',
        udf5: orderData.udf5 || '',
    };

    // Use URLSearchParams to safely encode the values
    const queryStr = new URLSearchParams(payloadFields).toString();

    // Encrypt the resulting query string using AES-128-CBC -> Base64
    const encData = encrypt(queryStr);

    return encData;
}
