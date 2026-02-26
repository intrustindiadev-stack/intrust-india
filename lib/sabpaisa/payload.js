import { sabpaisaConfig } from './config';
import { encrypt } from './encrypt';

// The encrypted payload follows the exact field order from sabpaisa-pg-dev npm package;
// authKey and authIV are used only for encryption - NOT included as payload fields.

export async function buildEncryptedPayload(orderData) {
    const payloadFields = {
        payerName: orderData.payerName || 'User',
        payerEmail: orderData.payerEmail || '',
        payerMobile: orderData.payerMobile || '9999999999',
        clientTxnId: orderData.clientTxnId,
        amount: Number(orderData.amount).toFixed(2),
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
        udf6: '',
        udf7: '',
        udf8: '',
        udf9: '',
        udf10: '',
        udf11: '',
        udf12: '',
        udf13: '',
        udf14: '',
        udf15: '',
        udf16: '',
        udf17: '',
        udf18: '',
        udf19: '',
        udf20: '',
        payerVpa: '',
        modeTransfer: '',
        byPassFlag: '',
        cardHolderName: '',
        pan: '',
        cardExpMonth: '',
        cardExpYear: '',
        cardType: '',
        cvv: '',
        browserDetails: '',
        bankId: '',
    };

    const queryStr = new URLSearchParams(payloadFields).toString();
    const encData = encrypt(queryStr);
    return encData;
}
