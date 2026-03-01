import crypto from 'crypto';
import { sabpaisaConfig } from './config';

/**
 * SabPaisa Integration Kit 2.0 — Encryption Module
 *
 * Matches the official sabpaisa-pg-dev@0.0.13 npm package exactly:
 *   - Algorithm:  AES-256-GCM (32-byte key from Base64-decoded authKey)
 *   - IV:         12 random bytes per encryption (GCM standard)
 *   - HMAC:       SHA-384 over [IV + Ciphertext + GCM-Tag], keyed with Base64-decoded authIV
 *   - Output:     [HMAC(48 bytes)] + [IV(12 bytes)] + [Ciphertext + GCM-Tag(16 bytes)] → uppercase hex
 *
 * Key mapping:
 *   authKey → AES-GCM encryption key
 *   authIV  → HMAC-SHA384 signing key (NOT an AES IV!)
 */

const IV_SIZE = 12;
const TAG_SIZE = 16;
const HMAC_LENGTH = 48; // SHA-384 = 48 bytes

/**
 * Decodes the Base64-encoded keys from config.
 * @returns {{ aesKey: Buffer, hmacKey: Buffer }}
 */
function getKeys() {
    const authKey = (sabpaisaConfig.authKey || '').trim();
    const authIV = (sabpaisaConfig.authIV || '').trim();

    if (!authKey || !authIV) {
        throw new Error('SabPaisa authKey or authIV is missing from environment variables');
    }

    const aesKey = Buffer.from(authKey, 'base64');
    const hmacKey = Buffer.from(authIV, 'base64');

    if (aesKey.length !== 16 && aesKey.length !== 32) {
        throw new Error(`Invalid authKey: Base64 decode gave ${aesKey.length} bytes, expected 16 or 32`);
    }

    return { aesKey, hmacKey };
}

/**
 * Encrypts plaintext using AES-256-GCM + HMAC-SHA384.
 * Output format: [HMAC(48)] + [IV(12)] + [Ciphertext + GCM-Tag(16)] → uppercase hex
 *
 * @param {string} plaintext - The URLSearchParams string to encrypt
 * @returns {string | null} Uppercase hex-encoded encrypted string
 */
export function encrypt(plaintext) {
    if (!plaintext) return null;

    const { aesKey, hmacKey } = getKeys();

    const algorithm = aesKey.length === 32 ? 'aes-256-gcm' : 'aes-128-gcm';

    // 1. Generate 12-byte random IV (GCM standard)
    const iv = crypto.randomBytes(IV_SIZE);

    // 2. AES-GCM encrypt
    const cipher = crypto.createCipheriv(algorithm, aesKey, iv);
    let ciphertext = cipher.update(plaintext, 'utf8');
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    const tag = cipher.getAuthTag(); // 16 bytes

    // 3. Construct encrypted message: [IV(12)] + [Ciphertext] + [Tag(16)]
    //    This matches the official SDK: encryptedMessage.set(iv); encryptedMessage.set(cipherTextWithTag, iv.length);
    //    Note: Web Crypto AES-GCM appends the tag to ciphertext automatically
    const encryptedMessage = Buffer.concat([iv, ciphertext, tag]);

    // 4. HMAC-SHA384 over the encrypted message (keyed with authIV)
    const hmac = crypto.createHmac('sha384', hmacKey)
        .update(encryptedMessage)
        .digest();

    // 5. Final: [HMAC(48)] + [IV(12)] + [Ciphertext] + [Tag(16)]
    const finalBuffer = Buffer.concat([hmac, encryptedMessage]);

    // 6. Uppercase hex output
    return finalBuffer.toString('hex').toUpperCase();
}

/**
 * Decrypts ciphertext using AES-256-GCM + HMAC-SHA384 verification.
 *
 * @param {string} hexCipherText - Uppercase hex-encoded encrypted string
 * @returns {string | null} Decrypted plaintext, or null on failure
 */
export function decrypt(hexCipherText) {
    if (!hexCipherText) return null;

    try {
        const { aesKey, hmacKey } = getKeys();

        const fullMessage = Buffer.from(hexCipherText, 'hex');

        // Minimum: HMAC(48) + IV(12) + Tag(16) = 76 bytes
        if (fullMessage.length < HMAC_LENGTH + IV_SIZE + TAG_SIZE) {
            console.error(`[SabPaisa] Ciphertext too short: ${fullMessage.length} bytes`);
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
            console.error('[SabPaisa] HMAC validation failed — payload may be tampered');
            return null;
        }

        // 3. Extract IV(12), Ciphertext, Tag(16)
        const iv = encryptedData.subarray(0, IV_SIZE);
        const ciphertextWithTag = encryptedData.subarray(IV_SIZE);
        const tag = ciphertextWithTag.subarray(ciphertextWithTag.length - TAG_SIZE);
        const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - TAG_SIZE);

        // 4. AES-GCM decrypt
        const algorithm = aesKey.length === 32 ? 'aes-256-gcm' : 'aes-128-gcm';
        const decipher = crypto.createDecipheriv(algorithm, aesKey, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
    } catch (error) {
        console.error('[SabPaisa] Decryption error:', error.message);
        return null;
    }
}