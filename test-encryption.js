/**
 * Test script to verify SabPaisa encryption matches the official SDK format.
 * 
 * Uses the sample credentials from SabPaisa's official .env.local:
 *   AUTH_KEY: ISTrmmDC2bTvkxzlDRrVguVwetGS8xC/UFPsp6w+Itg=
 *   AUTH_IV:  M+aUFgRMPq7ci+Cmoytp3KJ2GPBOwO72Z2Cjbr55zY7++pT9mLES2M5cIblnBtaX
 * 
 * Run: node test-encryption.js
 */

import crypto from 'crypto';

// --- Constants (must match encrypt.js) ---
const IV_SIZE = 12;
const TAG_SIZE = 16;
const HMAC_LENGTH = 48;

// --- Sample credentials from SabPaisa's official .env.local ---
const SAMPLE_AUTH_KEY = 'ISTrmmDC2bTvkxzlDRrVguVwetGS8xC/UFPsp6w+Itg=';
const SAMPLE_AUTH_IV = 'M+aUFgRMPq7ci+Cmoytp3KJ2GPBOwO72Z2Cjbr55zY7++pT9mLES2M5cIblnBtaX';

// --- Encryption (copied from encrypt.js logic for standalone use) ---
function encrypt(plaintext, authKeyB64, authIVB64) {
    const aesKey = Buffer.from(authKeyB64, 'base64');
    const hmacKey = Buffer.from(authIVB64, 'base64');

    const algorithm = aesKey.length === 32 ? 'aes-256-gcm' : 'aes-128-gcm';
    const iv = crypto.randomBytes(IV_SIZE);

    const cipher = crypto.createCipheriv(algorithm, aesKey, iv);
    let ciphertext = cipher.update(plaintext, 'utf8');
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    const tag = cipher.getAuthTag();

    const encryptedMessage = Buffer.concat([iv, ciphertext, tag]);
    const hmac = crypto.createHmac('sha384', hmacKey).update(encryptedMessage).digest();
    const finalBuffer = Buffer.concat([hmac, encryptedMessage]);

    return finalBuffer.toString('hex').toUpperCase();
}

function decrypt(hexCipherText, authKeyB64, authIVB64) {
    const aesKey = Buffer.from(authKeyB64, 'base64');
    const hmacKey = Buffer.from(authIVB64, 'base64');

    const fullMessage = Buffer.from(hexCipherText, 'hex');

    if (fullMessage.length < HMAC_LENGTH + IV_SIZE + TAG_SIZE) {
        throw new Error(`Ciphertext too short: ${fullMessage.length} bytes`);
    }

    const hmacReceived = fullMessage.subarray(0, HMAC_LENGTH);
    const encryptedData = fullMessage.subarray(HMAC_LENGTH);

    const hmacCalculated = crypto.createHmac('sha384', hmacKey).update(encryptedData).digest();
    if (!hmacCalculated.equals(hmacReceived)) {
        throw new Error('HMAC validation failed');
    }

    const iv = encryptedData.subarray(0, IV_SIZE);
    const ciphertextWithTag = encryptedData.subarray(IV_SIZE);
    const tag = ciphertextWithTag.subarray(ciphertextWithTag.length - TAG_SIZE);
    const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - TAG_SIZE);

    const algorithm = aesKey.length === 32 ? 'aes-256-gcm' : 'aes-128-gcm';
    const decipher = crypto.createDecipheriv(algorithm, aesKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
}

// --- Test ---
console.log('=== SabPaisa Encryption Test ===\n');

// 1. Show key info
const aesKey = Buffer.from(SAMPLE_AUTH_KEY, 'base64');
const hmacKey = Buffer.from(SAMPLE_AUTH_IV, 'base64');
console.log(`AES Key length (from authKey): ${aesKey.length} bytes → ${aesKey.length === 32 ? 'AES-256-GCM' : 'AES-128-GCM'}`);
console.log(`HMAC Key length (from authIV): ${hmacKey.length} bytes → HMAC-SHA384`);

// 2. Build sample payload (matching official SDK format)
const params = new URLSearchParams({
    payerName: 'Anand Kumar Shaw',
    payerEmail: 'anand.kumar@sabpaisa.in',
    payerMobile: '6291312929',
    clientTxnId: 'DJ020-2023-10-05-0001',
    amount: '8625.00',
    clientCode: 'DJ020',
    transUserName: 'DJL754@sp',
    transUserPassword: '4q3qhgmJNM4m',
    callbackUrl: 'http://localhost:3000/response',
    channelId: 'npm',
    udf1: '', udf2: '', udf3: '', udf4: '', udf5: '',
    udf6: '', udf7: '', udf8: '', udf9: '', udf10: '',
    udf11: '', udf12: '', udf13: '', udf14: '', udf15: '',
    udf16: '', udf17: '', udf18: '', udf19: '', udf20: '',
    payerVpa: '', modeTransfer: '', byPassFlag: '',
    cardHolderName: '', pan: '', cardExpMonth: '',
    cardExpYear: '', cardType: '', cvv: '',
    browserDetails: '', bankId: ''
});

const rawPayload = params.toString();
console.log(`\nRaw payload (${rawPayload.length} chars):`);
console.log(rawPayload);

// 3. Encrypt
const encrypted = encrypt(rawPayload, SAMPLE_AUTH_KEY, SAMPLE_AUTH_IV);
console.log(`\nEncrypted output (${encrypted.length} hex chars):`);
console.log(encrypted);

// 4. Validate format
const isUppercaseHex = /^[0-9A-F]+$/.test(encrypted);
console.log(`\nFormat validation:`);
console.log(`  Uppercase hex only: ${isUppercaseHex ? '✅ YES' : '❌ NO'}`);
console.log(`  Minimum length (152 hex chars = 76 bytes): ${encrypted.length >= 152 ? '✅ YES' : '❌ NO'} (${encrypted.length} chars)`);

// 5. Decrypt and verify roundtrip
const decrypted = decrypt(encrypted, SAMPLE_AUTH_KEY, SAMPLE_AUTH_IV);
const roundtripOk = decrypted === rawPayload;
console.log(`  Decrypt roundtrip: ${roundtripOk ? '✅ PASS' : '❌ FAIL'}`);

if (!roundtripOk) {
    console.log('\n  DECRYPTED:', decrypted);
}

// 6. Show structure breakdown
const fullBuf = Buffer.from(encrypted, 'hex');
console.log(`\nStructure breakdown:`);
console.log(`  Total bytes: ${fullBuf.length}`);
console.log(`  HMAC (bytes 0-47): ${fullBuf.subarray(0, 48).toString('hex').toUpperCase().substring(0, 40)}...`);
console.log(`  IV   (bytes 48-59): ${fullBuf.subarray(48, 60).toString('hex').toUpperCase()}`);
console.log(`  Ciphertext+Tag (bytes 60+): ${fullBuf.length - 60} bytes`);
console.log(`    ↳ Ciphertext: ${fullBuf.length - 60 - 16} bytes`);
console.log(`    ↳ GCM Tag (last 16): ${fullBuf.subarray(fullBuf.length - 16).toString('hex').toUpperCase()}`);

console.log('\n=== Test Complete ===');
