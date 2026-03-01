import fs from 'fs';
import { sabpaisaConfig } from './config';
import { encrypt } from './encrypt';

/**
 * Builds the encrypted payload for SabPaisa payment initiation.
 *
 * Field order and inclusion matches the official sabpaisa-pg-dev@0.0.13 SDK:
 * PaymentForm.js → submitPaymentForm() → new URLSearchParams({...})
 *
 * Notable differences from our previous version:
 *   - No 'mcc' field (not in official SDK)
 *   - No 'transDate' field (not in official SDK)
 *   - channelId comes from orderData (not hardcoded 'W')
 */
export function buildEncryptedPayload(orderData) {

    const txnId = (orderData.clientTxnId || '').trim();
    const payerEmail = (orderData.payerEmail || '').trim() || 'guest@sabpaisa.in';

    // Field order matches the official SDK exactly
    const params = new URLSearchParams({
        payerName: (orderData.payerName || 'User').trim(),
        payerEmail: payerEmail,
        payerMobile: (orderData.payerMobile || '9999999999').trim(),
        clientTxnId: txnId,
        amount: Number(orderData.amount).toFixed(2),
        clientCode: (sabpaisaConfig.clientCode || '').trim(),
        transUserName: (sabpaisaConfig.username || '').trim(),
        transUserPassword: (sabpaisaConfig.password || '').trim(),
        callbackUrl: (sabpaisaConfig.callbackUrl || '').trim(),
        channelId: (orderData.channelId || 'W').trim(),
        udf1: orderData.udf1 || '',
        udf2: orderData.udf2 || '',
        udf3: orderData.udf3 || '',
        udf4: orderData.udf4 || '',
        udf5: orderData.udf5 || '',
        udf6: orderData.udf6 || '',
        udf7: orderData.udf7 || '',
        udf8: orderData.udf8 || '',
        udf9: orderData.udf9 || '',
        udf10: orderData.udf10 || '',
        udf11: orderData.udf11 || '',
        udf12: orderData.udf12 || '',
        udf13: orderData.udf13 || '',
        udf14: orderData.udf14 || '',
        udf15: orderData.udf15 || '',
        udf16: orderData.udf16 || '',
        udf17: orderData.udf17 || '',
        udf18: orderData.udf18 || '',
        udf19: orderData.udf19 || '',
        udf20: orderData.udf20 || '',
        payerVpa: orderData.payerVpa || '',
        modeTransfer: orderData.modeTransfer || '',
        byPassFlag: orderData.byPassFlag || '',
        cardHolderName: orderData.cardHolderName || '',
        pan: orderData.pan || '',
        cardExpMonth: orderData.cardExpMonth || '',
        cardExpYear: orderData.cardExpYear || '',
        cardType: orderData.cardType || '',
        cvv: orderData.cvv || '',
        browserDetails: orderData.browserDetails || '',
        bankId: orderData.bankId || ''
    });

    const rawPayload = params.toString();

    if (process.env.NODE_ENV !== 'production') {
        try { fs.appendFileSync('sabpaisa-debug.log', `\nRAW PAYLOAD: ${rawPayload}\n`); } catch (_) { }
        console.log('RAW PAYLOAD:', rawPayload);
    }

    const encrypted = encrypt(rawPayload);

    if (process.env.NODE_ENV !== 'production') {
        try { fs.appendFileSync('sabpaisa-debug.log', `\nENCRYPTED: ${encrypted}\n`); } catch (_) { }
        console.log('ENCRYPTED:', encrypted);
    }

    return encrypted;
}