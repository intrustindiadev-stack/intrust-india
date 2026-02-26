import crypto from 'crypto';
import { sabpaisaConfig } from './config';

// Mirrors the exact algorithm in the sabpaisa-pg-dev npm package:
//   - AES-GCM encryption with a 12-byte random IV
//   - HMAC-SHA384 prepended to the ciphertext
//   - Output: UPPERCASE HEX string
//   - Keys decoded from BASE64 (the authKey/authIV env vars are plain UTF-8
//     but the npm package's atob() expects Base64; we match by treating them
//     as raw bytes directly using Buffer)

/**
 * Decodes the auth key/IV the same way the npm package's `s()` function does:
 * s(e) = Uint8Array.from(atob(e), e => e.charCodeAt(0))
 * i.e. Base64-decode the string.
 *
 * BUT: Your keys (Lq0QNScppWPtYFGK) are plain ASCII, not Base64.
 * So we must first Base64-encode them, then the atob() round-trip gives back the raw bytes.
 * Net effect: the key bytes are the same as Buffer.from(authKey, 'utf8')
 * We replicate: Buffer.from(authKey, 'utf8')  (no base64 step needed server-side)
 */
function getKeyBytes(str) {
    // The npm package does: Uint8Array.from(atob(str), c => c.charCodeAt(0))
    // atob() decodes Base64. Your keys are plain UTF-8, not Base64.
    // To replicate the browser behavior when btoa(rawKey) was passed in old code:
    //   btoa('Lq0QNScppWPtYFGK') => base64 string
    //   atob(base64string) => 'Lq0QNScppWPtYFGK' => charCodes = raw utf8 bytes
    // Net: we get the raw UTF-8 bytes, same as Buffer.from(str, 'utf8')
    return Buffer.from(str, 'utf8');
}

/**
 * Encrypts plaintext using AES-GCM + HMAC-SHA384, outputting uppercase HEX.
 * Mirrors this logic from the npm package:
 *
 *   const iv = crypto.getRandomValues(new Uint8Array(12));  // 12-byte random IV
 *   const encrypted = AES-GCM.encrypt(key=r, iv=iv, data=plaintext)
 *   const combined = [...iv, ...encrypted]          // IV prepended to ciphertext+tag
 *   const hmac = HMAC-SHA384(key=n, data=combined)
 *   return HEX([...hmac, ...combined])              // HMAC prepended to combined
 *
 * @param {string} plaintext
 * @returns {string} uppercase hex-encoded encrypted payload
 */
export async function encrypt(plaintext) {
    const keyBytes = getKeyBytes(sabpaisaConfig.authKey);
    const ivKeyBytes = getKeyBytes(sabpaisaConfig.authIV);

    // 1. Generate 12-byte random IV (same as npm package)
    const iv = crypto.randomBytes(12);

    // 2. AES-256-GCM encrypt (Node crypto uses 256-bit if key is 32 bytes, 128-bit if 16 bytes)
    //    The npm package imports the key as raw for AES-GCM (no explicit key size, browser uses whatever raw bytes)
    //    Your key is 16 bytes → AES-128-GCM
    const cipher = crypto.createCipheriv(`aes-${keyBytes.length * 8}-gcm`, keyBytes, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();  // 16-byte GCM auth tag

    // 3. combined = IV + encrypted + authTag  (npm package: GCM tag is appended by subtle.encrypt automatically)
    const combined = Buffer.concat([iv, encrypted, authTag]);

    // 4. HMAC-SHA384 over combined, using authIV as the HMAC key
    const hmac = crypto.createHmac('sha384', ivKeyBytes);
    hmac.update(combined);
    const hmacBytes = hmac.digest();

    // 5. Final output = HMAC + combined, hex-encoded uppercase
    const finalBytes = Buffer.concat([hmacBytes, combined]);
    return finalBytes.toString('hex').toUpperCase();
}

/**
 * Decrypts a hex-encoded AES-GCM + HMAC-SHA384 ciphertext.
 * Mirrors the npm package's decrypt function.
 *
 * @param {string} hexCiphertext
 * @returns {string} decrypted plaintext
 */
export async function decrypt(hexCiphertext) {
    // The npm package's decrypt replaces spaces with + first (URL encoding artifact)
    const hex = hexCiphertext.replace(/ /g, '+');

    const keyBytes = getKeyBytes(sabpaisaConfig.authKey);
    const ivKeyBytes = getKeyBytes(sabpaisaConfig.authIV);

    // Convert hex to bytes
    const allBytes = Buffer.from(hex, 'hex');

    if (allBytes.length < 76) throw new Error('Invalid ciphertext: too short');

    // Split: first 48 bytes = HMAC-SHA384, rest = combined (IV + ciphertext+tag)
    const hmacBytes = allBytes.slice(0, 48);
    const combined = allBytes.slice(48);

    // Verify HMAC
    const hmac = crypto.createHmac('sha384', ivKeyBytes);
    hmac.update(combined);
    const expectedHmac = hmac.digest();
    if (!crypto.timingSafeEqual(hmacBytes, expectedHmac)) {
        throw new Error('HMAC validation failed. Data may be tampered!');
    }

    // Split combined: first 12 = IV, last 16 = auth tag, middle = ciphertext
    const iv = combined.slice(0, 12);
    const tag = combined.slice(combined.length - 16);
    const ciphertext = combined.slice(12, combined.length - 16);

    const decipher = crypto.createDecipheriv(`aes-${keyBytes.length * 8}-gcm`, keyBytes, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return decrypted.toString('utf8');
}
