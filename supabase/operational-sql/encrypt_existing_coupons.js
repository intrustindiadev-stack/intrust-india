/**
 * Migration Script: Encrypt Existing Plaintext Coupons
 * 
 * Run this script to find all coupons currently stored in plaintext
 * and encrypt them using the new AES-256-GCM logic.
 * 
 * Usage from root directory:
 * node database_scripts/encrypt_existing_coupons.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' }); // fallback

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
    let key = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("Missing ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY in environment variables.");

    if (Buffer.from(key).length !== 32) {
        return crypto.createHash('sha256').update(String(key)).digest();
    }
    return Buffer.from(key);
}

function encryptCouponCode(text) {
    if (!text) return text;
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function migrate() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase credentials in environment variables.");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching coupons...");

    // We paginate to handle large amounts safely
    let limit = 1000;
    let offset = 0;
    let hasMore = true;
    let updatedCount = 0;

    while (hasMore) {
        const { data: coupons, error } = await supabase
            .from('coupons')
            .select('id, encrypted_code')
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Error fetching coupons:", error);
            process.exit(1);
        }

        if (coupons.length === 0) {
            hasMore = false;
            break;
        }

        for (const coupon of coupons) {
            // Check if it's already encrypted.
            // Our encrypted format contains two colons (iv:tag:ciphertext)
            // A plaintext coupon code is unlikely to have two colons.
            const parts = (coupon.encrypted_code || '').split(':');
            if (parts.length !== 3) {
                console.log(`Encrypting coupon ID: ${coupon.id}`);
                const newlyEncrypted = encryptCouponCode(coupon.encrypted_code);

                const { error: updateError } = await supabase
                    .from('coupons')
                    .update({ encrypted_code: newlyEncrypted })
                    .eq('id', coupon.id);

                if (updateError) {
                    console.error(`Failed to update coupon ${coupon.id}:`, updateError);
                } else {
                    updatedCount++;
                }
            }
        }

        offset += limit;
    }

    console.log(`Migration complete. Encrypted ${updatedCount} plaintext coupons.`);
}

migrate().catch(console.error);
