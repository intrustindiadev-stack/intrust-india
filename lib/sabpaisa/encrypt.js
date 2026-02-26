import crypto from 'crypto';
import { sabpaisaConfig } from './config';

// 128-bit key implies 16 bytes.
const ALGORITHM = 'aes-128-cbc';

/**
 * Get Key and IV scaled to exactly 16 bytes for AES-128
 * Using pure raw UTF-8 as requested by SabPaisa Legacy docs
 */
function getKeys() {
    const key = Buffer.from(sabpaisaConfig.authKey, 'utf8').slice(0, 16);
    const iv = Buffer.from(sabpaisaConfig.authIV, 'utf8').slice(0, 16);
    return { key, iv };
}

/**
 * Encrypt plaintext using AES-128-CBC with PKCS7
 * @param {string} plaintext - Raw URL query string to encrypt
 * @returns {string} - Base64 encoded ciphertext
 */
export function encrypt(plaintext) {
    if (!plaintext) return null;
    try {
        const { key, iv } = getKeys();

        // AES-128-CBC requires exactly 16 byte key and 16 byte IV
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // SabPaisa expects PKCS7 padding which is default in Node crypto, but explicitly enable
        cipher.setAutoPadding(true);

        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        return encrypted;
    } catch (error) {
        console.error('SabPaisa Encryption Error:', error);
        throw new Error('Encryption failed');
    }
}

/**
 * Decrypt base64 ciphertext using AES-128-CBC
 * @param {string} ciphertextBase64 - Base64 string from SabPaisa
 * @returns {string} - Decrypted plaintext
 */
export function decrypt(ciphertextBase64) {
    if (!ciphertextBase64) return null;
    try {
        const { key, iv } = getKeys();

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAutoPadding(true);

        let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('SabPaisa Decryption Error:', error);
        throw new Error('Decryption failed');
    }
}
