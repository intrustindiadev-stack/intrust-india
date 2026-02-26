import crypto from 'crypto';
import { sabpaisaConfig } from './config';

/**
 * Sabpaisa Legacy Encryption spec (AES-128-CBC)
 * As per user instructions in Step 7:
 *   Algorithm: AES-128-CBC
 *   Key/IV bytes: raw UTF-8 (not base64)
 *   Padding: PKCS7 (default)
 *   Output: BASE64
 */

export function encrypt(plaintext) {
    if (!plaintext) return null;

    try {
        const key = Buffer.from(sabpaisaConfig.authKey, 'utf8').subarray(0, 16);
        const iv = Buffer.from(sabpaisaConfig.authIV, 'utf8').subarray(0, 16);

        const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        cipher.setAutoPadding(true);

        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        return encrypted;
    } catch (error) {
        console.error('[Sabpaisa CBC] Encryption Error:', error);
        throw error;
    }
}

export function decrypt(ciphertext) {
    if (!ciphertext) return null;

    try {
        const key = Buffer.from(sabpaisaConfig.authKey, 'utf8').subarray(0, 16);
        const iv = Buffer.from(sabpaisaConfig.authIV, 'utf8').subarray(0, 16);

        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        decipher.setAutoPadding(true);

        let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[Sabpaisa CBC] Decryption Error:', error);
        return null;
    }
}
