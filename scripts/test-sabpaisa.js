// const { encrypt } = require('../lib/sabpaisa/encryption');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        envVars[key] = value;
    }
});

const testPayload = async () => {
    const clientCode = envVars.SABPAISA_CLIENT_CODE;
    const username = envVars.SABPAISA_USERNAME;
    const password = envVars.SABPAISA_PASSWORD;
    const authKey = envVars.SABPAISA_AUTH_KEY;
    const authIV = envVars.SABPAISA_AUTH_IV;

    console.log('--- Config ---');
    console.log('Client Code:', clientCode);
    console.log('Username:', username);
    console.log('Key Length:', Buffer.from(authKey, 'base64').length);
    console.log('IV Length:', Buffer.from(authIV, 'base64').length);

    const paymentData = {
        amount: '10.00',
        payerName: 'Test User',
        payerEmail: 'test@example.com',
        payerMobile: '9999999999',
        clientTxnId: 'TXN_' + Date.now(),
        callbackUrl: 'http://localhost:3000/api/payment/callback'
    };

    // LOGIC FROM client.js (Replicated for testing)
    const formattedAmount = Number(paymentData.amount).toFixed(2);

    // Current Date logic
    const now = new Date();
    const transDate = now.toISOString().replace('T', ' ').substring(0, 19);

    const params = new URLSearchParams();
    params.append('clientCode', clientCode);
    params.append('transUserName', username);
    params.append('transUserPassword', password);
    params.append('clientTxnId', paymentData.clientTxnId);
    params.append('amount', formattedAmount);
    params.append('amountType', 'INR');
    params.append('channelId', 'W');
    params.append('mcc', '5666');
    params.append('transDate', transDate);
    params.append('payerName', paymentData.payerName);
    params.append('payerEmail', paymentData.payerEmail);
    params.append('payerMobile', paymentData.payerMobile);
    params.append('payerAddress', 'NA');
    params.append('callbackUrl', paymentData.callbackUrl);
    params.append('udf1', 'NA');
    params.append('udf2', 'NA');
    params.append('udf3', 'NA');
    params.append('udf4', 'NA');
    params.append('udf5', 'NA');

    const queryString = params.toString();
    const rawQueryStr = decodeURIComponent(queryString);

    console.log('\n--- Raw Payload (Before Encryption) ---');
    console.log(rawQueryStr);

    console.log('\n--- Encrypted Output ---');
    // We need to import encryption properly. 
    // Since encryption.js uses ES6 import, and this is a node script, we might have issues.
    // I will mock the encrypt function here to replicate encryption.js logic exactly for this test.

    const crypto = require('crypto');
    const encryptMock = (text) => {
        try {
            const keyBuffer = Buffer.from(authKey, 'base64');
            const ivBuffer = Buffer.from(authIV, 'base64');
            const algorithm = 'aes-256-cbc';

            // Replicate the slicing logic/check exactly
            let finalKey = keyBuffer;
            if (finalKey.length !== 32) {
                finalKey = Buffer.alloc(32);
                keyBuffer.copy(finalKey);
            }

            let finalIV = ivBuffer;
            if (finalIV.length !== 16) {
                finalIV = Buffer.alloc(16);
                ivBuffer.copy(finalIV, 0, 0, 16);
            }

            const cipher = crypto.createCipheriv(algorithm, finalKey, finalIV);
            let encrypted = cipher.update(text, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    const encData = encryptMock(rawQueryStr);
    console.log('encData:', encData);
};

testPayload();
