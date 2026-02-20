import crypto from 'crypto';
import SABPAISA_CONFIG from './config';

const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts data using AES-256-CBC
 * @param {string} text - The text to encrypt
 * @returns {string} - The encrypted string in base64
 */
export const encrypt = (text) => {
    if (!text) return null;
    try {
        const keyConfig = SABPAISA_CONFIG.authKey || '';
        const ivConfig = SABPAISA_CONFIG.authIV || '';

        // 1. Try Base64 Decoding first (standard for 32-byte keys)
        let keyBuffer;
        if (keyConfig.trim().endsWith('=')) {
            keyBuffer = Buffer.from(keyConfig, 'base64');
        } else {
            keyBuffer = Buffer.from(keyConfig, 'utf8');
        }

        let ivBuffer;
        if (ivConfig.trim().endsWith('=')) {
            ivBuffer = Buffer.from(ivConfig, 'base64');
        } else {
            ivBuffer = Buffer.from(ivConfig, 'utf8');
        }

        // 2. Enforce Key Length (32 bytes for AES-256)
        let algorithm = 'aes-256-cbc';
        let finalKey;

        if (keyBuffer.length === 32) {
            finalKey = keyBuffer;
        } else {
            console.warn(`[Sabpaisa] Key buffer length is ${keyBuffer.length}. Slicing/Padding to 32 bytes.`);
            finalKey = Buffer.alloc(32);
            keyBuffer.copy(finalKey);
        }

        // 3. Enforce IV Length (16 bytes)
        let finalIV;
        if (ivBuffer.length === 16) {
            finalIV = ivBuffer;
        } else {
            console.warn(`[Sabpaisa] IV buffer length is ${ivBuffer.length}. Slicing to 16 bytes.`);
            finalIV = Buffer.alloc(16);
            ivBuffer.copy(finalIV, 0, 0, 16);
        }

        console.log(`[Sabpaisa] Encrypting with Algo: ${algorithm}, KeyLen: ${finalKey.length}, IVLen: ${finalIV.length}`);

        const cipher = crypto.createCipheriv(algorithm, finalKey, finalIV);
        let encrypted = cipher.update(text, 'utf8', 'base64'); // Output Base64
        encrypted += cipher.final('base64'); // Output Base64
        return encrypted;
    } catch (error) {
        console.error('Sabpaisa Encryption Error:', error);
        throw new Error('Encryption failed');
    }
};

/**
 * Decrypts data using AES-256-CBC
 * @param {string} encryptedText - The encrypted text in base64
 * @returns {string} - The decrypted string
 */
export const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        const key = Buffer.from(SABPAISA_CONFIG.authKey, 'utf8').subarray(0, 32);
        const iv = Buffer.from(SABPAISA_CONFIG.authIV, 'utf8').subarray(0, 16);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText, 'base64', 'utf8'); // Input Base64
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Sabpaisa Decryption Error:', error);
        return null;
    }
};

/**
 * Generates HMAC checksum if required (checking Sabpaisa's specific requirement)
 * Usually they use AES encryption for the payload, but sometimes a checksum is needed for integrity.
 */
export const generateChecksum = (params) => {
    // Implementation depends on specific Sabpaisa documentation. 
    // Often it's a concatenation of fields + secret key hashed with MD5 or SHA256.
    // Placeholder for now.
    return '';
};
