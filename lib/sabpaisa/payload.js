import { sabpaisaConfig } from './config';
import { encrypt } from './encrypt';

export function buildEncryptedPayload(orderData) {
    // 🔴 APPROACH E: RAW Query String (No URL Encoding) + AES-128-CBC + HEX Output
    // Legacy SabPaisa systems often fail if the encrypted string contains 
    // URL-encoded characters (like %40 for @). This kit uses a raw string.

    const txnId = (orderData.clientTxnId || '').trim().slice(0, 20);

    // Build the string MANUALLY without URL encoding
    const rawPayload = [
        `payerName=${(orderData.payerName || 'User').trim()}`,
        `payerEmail=${(orderData.payerEmail || 'NA').trim()}`,
        `payerMobile=${(orderData.payerMobile || '9999999999').trim()}`,
        `clientTxnId=${txnId}`,
        `amount=${Number(orderData.amount).toFixed(2)}`,
        `clientCode=${(sabpaisaConfig.clientCode || '').trim()}`,
        `transUserName=${(sabpaisaConfig.username || '').trim()}`,
        `transUserPassword=${(sabpaisaConfig.password || '').trim()}`,
        `callbackUrl=${(sabpaisaConfig.callbackUrl || '').trim()}`,
        `channelId=W`,
        `udf1=${(orderData.udf1 || 'WALLET_TOPUP').trim()}`,
        `udf2=${(orderData.udf2 || 'NA').trim()}`,
        `udf3=NA`, `udf4=NA`, `udf5=NA`, `udf6=NA`, `udf7=NA`, `udf8=NA`, `udf9=NA`, `udf10=NA`,
        `udf11=NA`, `udf12=NA`, `udf13=NA`, `udf14=NA`, `udf15=NA`, `udf16=NA`, `udf17=NA`, `udf18=NA`, `udf19=NA`, `udf20=NA`,
        `amountType=INR`,
        `env=PROD`
    ].join('&');

    const encrypted = encrypt(rawPayload);

    console.log('------------------------------------------');
    console.log('SabPaisa DEBUG (Approach E: Raw Query+CBC+HEX):');
    console.log('RAW STRING (UNENCODED):', rawPayload);
    console.log('ENCRYPTED (HEX):', encrypted);

    return encrypted;
}
