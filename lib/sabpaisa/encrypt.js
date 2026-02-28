import crypto from 'crypto';
import { sabpaisaConfig } from './config';

function getKeyIV() {
    const keyStr = (sabpaisaConfig.authKey || '').trim();
    const ivStr = (sabpaisaConfig.authIV || '').trim();

    if (keyStr.length !== 16) {
        throw new Error(`SabPaisa authKey must be exactly 16 chars. Got ${keyStr.length}`);
    }

    if (ivStr.length !== 16) {
        throw new Error(`SabPaisa authIV must be exactly 16 chars. Got ${ivStr.length}`);
    }

    return {
        key: Buffer.from(keyStr, 'utf8'),
        iv: Buffer.from(ivStr, 'utf8')
    };
}

export function encrypt(plaintext) {
    if (!plaintext) return null;

    const { key, iv } = getKeyIV();

    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    cipher.setAutoPadding(true);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted.toUpperCase();
}



export function decrypt(ciphertext) {
    if (!ciphertext) return null;

    const { key, iv } = getKeyIV();

    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
