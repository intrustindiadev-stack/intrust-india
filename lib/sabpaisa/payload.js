import fs from 'fs';
import { sabpaisaConfig } from './config';
import { encrypt } from './encryption';
import { formatDate } from './utils';

export function buildEncryptedPayload(orderData) {

    const txnId = (orderData.clientTxnId || '').trim();

    const payerEmail = (orderData.payerEmail || '').trim() || 'guest@sabpaisa.in';


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
        channelId: 'W',
        mcc: '',
        transDate: formatDate(new Date()),
        udf1: (orderData.udf1 || '').trim(),
        udf2: (orderData.udf2 || '').trim(),
        udf3: (orderData.udf3 || '').trim(),
        udf4: (orderData.udf4 || '').trim(),
        udf5: (orderData.udf5 || '').trim(),
        udf6: '', udf7: '', udf8: '', udf9: '', udf10: '',
        udf11: '', udf12: '', udf13: '', udf14: '', udf15: '',
        udf16: '', udf17: '', udf18: '', udf19: '', udf20: '',
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
        bankId: ''
    });

    const rawPayload = params.toString();

    if (process.env.NODE_ENV !== 'production') {
        try { fs.appendFileSync('sabpaisa-debug.log', `\nFINAL CORRECTED RAW PAYLOAD: ${rawPayload}\n`); } catch (_) { }
    }

    const encrypted = encrypt(rawPayload);

    if (process.env.NODE_ENV !== 'production') {
        try { fs.appendFileSync('sabpaisa-debug.log', `\nFINAL ENCDATA: ${encrypted}\n`); } catch (_) { }
    }

    if (process.env.NODE_ENV !== 'production') {
        console.log('------------------------------------------');
        console.log('SabPaisa DEBUG (Kit 2.0: GCM + HMAC):');
        console.log('RAW STRING:', rawPayload);
        console.log('ENCRYPTED (HEX):', encrypted);
    }

    return encrypted;
}
