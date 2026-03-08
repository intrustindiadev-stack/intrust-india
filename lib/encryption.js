import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
    // 1. Try to get ENCRYPTION_KEY from env
    let key = process.env.ENCRYPTION_KEY;

    // 2. Fallback to SUPABASE_SERVICE_ROLE_KEY for local dev if ENCRYPTION_KEY is missing
    if (!key) {
        key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!key) {
            console.error("WARNING: No ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY found in environment variables. Encryption will fail.");
            return null;
        }
    }

    // Ensure the key is exactly 32 bytes for aes-256-gcm
    // If it's not 32 bytes, we hash it to get a consistent 32-byte key
    if (Buffer.from(key).length !== 32) {
        return crypto.createHash('sha256').update(String(key)).digest();
    }

    return Buffer.from(key);
}

export function encryptCouponCode(text) {
    if (!text) return text;

    const key = getEncryptionKey();
    if (!key) throw new Error("Encryption key is not configured.");

    // Generate a random initialization vector
    const iv = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the auth tag
    const authTag = cipher.getAuthTag().toString('hex');

    // Return the iv, auth tag, and encrypted text separated by colons
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptCouponCode(encryptedData) {
    if (!encryptedData) return encryptedData;

    // Check if the string matches the expected format (iv:authTag:encryptedText)
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        // If it doesn't match the format, assume it's a legacy plaintext coupon and return it as-is
        // This provides graceful degradation during the migration period
        return encryptedData;
    }

    try {
        const key = getEncryptionKey();
        if (!key) throw new Error("Encryption key is not configured.");

        const [ivHex, authTagHex, encryptedHex] = parts;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (e) {
        console.error("Failed to decrypt coupon code:", e);
        // If decryption fails (e.g. wrong key, tampered data), throw error or return null
        throw new Error("Failed to decrypt coupon code");
    }
}
