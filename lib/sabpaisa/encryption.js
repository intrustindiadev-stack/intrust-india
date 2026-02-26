import crypto from 'crypto';
import SABPAISA_CONFIG from './config';

/**
 * Sabpaisa Integration Kit 2.0 — Unified Encryption Module
 *
 * Spec:
 *   Keys:      Raw UTF-8 strings from Sabpaisa panel (authKey → AES key, authIV → HMAC key)
 *   Algorithm: AES-128-GCM (16-byte key) or AES-256-GCM (32-byte key)
 *   IV:        12 bytes (GCM standard)
 *   HMAC:      SHA-384 over [IV + Ciphertext + GCM-Tag]
 *   Output:    [HMAC(48)] + [IV(12)] + [Ciphertext] + [Tag(16)]  → uppercase hex
 */

const IV_SIZE = 12;
const TAG_SIZE = 16;
const HMAC_LENGTH = 48; // SHA-384 => 48 bytes

/**
 * Returns the { aesKey, hmacKey } buffers derived from config.
 * Keys are raw UTF-8 strings from the Sabpaisa panel.
 */
function getKeys(authKeyOverride, authIVOverride) {
    const authKey = authKeyOverride || SABPAISA_CONFIG.authKey || '';
    const authIV = authIVOverride || SABPAISA_CONFIG.authIV || '';

    const aesKey = Buffer.from(authKey, 'utf8');
    const hmacKey = Buffer.from(authIV, 'utf8');

    return { aesKey, hmacKey };
}

/**
 * Auto-detect AES algorithm from key length.
 * @param {Buffer} aesKey
 * @returns {string}
 */
function detectAlgorithm(aesKey) {
    if (aesKey.length >= 32) return 'aes-256-gcm';
    if (aesKey.length >= 16) return 'aes-128-gcm';
    throw new Error(`Invalid AES key length: ${aesKey.length} bytes. Expected 16 or 32.`);
}

/**
 * Encrypts data using Sabpaisa Integration Kit 2.0 spec.
 *
 * @param {string} plaintext - The query-string payload to encrypt
 * @param {string} [authKeyOverride] - Optional base64 auth key (falls back to config)
 * @param {string} [authIVOverride] - Optional base64 auth IV (falls back to config)
 * @returns {string} Uppercase hex-encoded encrypted string
 */
export const encrypt = (plaintext, authKeyOverride, authIVOverride) => {
    if (!plaintext) return null;
    try {
        const { aesKey, hmacKey } = getKeys(authKeyOverride, authIVOverride);
        const algorithm = detectAlgorithm(aesKey);

        // 1. Generate 12-byte random IV (GCM standard)
        const iv = crypto.randomBytes(IV_SIZE);

        // 2. AES-GCM encrypt
        const cipher = crypto.createCipheriv(algorithm, aesKey, iv);
        let ciphertext = cipher.update(plaintext, 'utf8');
        ciphertext = Buffer.concat([ciphertext, cipher.final()]);
        const tag = cipher.getAuthTag(); // 16 bytes

        // 3. Construct encrypted message: [IV(12)] + [Ciphertext] + [Tag(16)]
        const encryptedMessage = Buffer.concat([iv, ciphertext, tag]);

        // 4. HMAC-SHA384 over the encrypted message
        const hmac = crypto.createHmac('sha384', hmacKey)
            .update(encryptedMessage)
            .digest();

        // 5. Final: [HMAC(48)] + [IV(12)] + [Ciphertext] + [Tag(16)]
        const finalBuffer = Buffer.concat([hmac, encryptedMessage]);

        // 6. Uppercase hex
        const hexOutput = finalBuffer.toString('hex').toUpperCase();

        console.log(`[Sabpaisa] Encrypt: algo=${algorithm}, keyLen=${aesKey.length}, ivLen=${IV_SIZE}, outLen=${hexOutput.length}`);

        return hexOutput;
    } catch (error) {
        console.error('Sabpaisa Encryption Error:', error);
        throw new Error('Encryption failed: ' + error.message);
    }
};

/**
 * Decrypts data using Sabpaisa Integration Kit 2.0 spec.
 *
 * @param {string} hexCipherText - Uppercase hex-encoded encrypted string
 * @param {string} [authKeyOverride] - Optional base64 auth key (falls back to config)
 * @param {string} [authIVOverride] - Optional base64 auth IV (falls back to config)
 * @returns {string | null} Decrypted plaintext, or null on failure
 */
export const decrypt = (hexCipherText, authKeyOverride, authIVOverride) => {
    if (!hexCipherText) return null;
    try {
        const { aesKey, hmacKey } = getKeys(authKeyOverride, authIVOverride);

        const fullMessage = Buffer.from(hexCipherText, 'hex');

        // Minimum: HMAC(48) + IV(12) + Tag(16) = 76 bytes (zero-length ciphertext)
        if (fullMessage.length < HMAC_LENGTH + IV_SIZE + TAG_SIZE) {
            console.error(`Sabpaisa: Ciphertext too short (${fullMessage.length} bytes)`);
            return null;
        }

        // 1. Split HMAC from encrypted data
        const hmacReceived = fullMessage.subarray(0, HMAC_LENGTH);
        const encryptedData = fullMessage.subarray(HMAC_LENGTH);

        // 2. Verify HMAC-SHA384
        const hmacCalculated = crypto.createHmac('sha384', hmacKey)
            .update(encryptedData)
            .digest();

        if (!hmacCalculated.equals(hmacReceived)) {
            console.error('Sabpaisa: HMAC validation failed — payload may be tampered');
            return null;
        }

        // 3. Extract IV(12), Ciphertext, Tag(16)
        const iv = encryptedData.subarray(0, IV_SIZE);
        const ciphertextWithTag = encryptedData.subarray(IV_SIZE);
        const tag = ciphertextWithTag.subarray(ciphertextWithTag.length - TAG_SIZE);
        const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - TAG_SIZE);

        // 4. AES-GCM decrypt
        const algorithm = detectAlgorithm(aesKey);
        const decipher = crypto.createDecipheriv(algorithm, aesKey, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
    } catch (error) {
        console.error('Sabpaisa Decryption Error:', error);
        return null;
    }
};
