const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bhgbylyzlwmmabegxlfc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
    let key = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("Encryption key is missing");

    if (Buffer.from(key).length !== 32) {
        return crypto.createHash('sha256').update(String(key)).digest();
    }
    return Buffer.from(key);
}

function decryptText(encryptedData) {
    if (!encryptedData) return encryptedData;
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return encryptedData;
    try {
        const key = getEncryptionKey();
        const [ivHex, authTagHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return null; // failed to decrypt
    }
}

async function fixMaskedPANs() {
    // find rows where pan_number is null but id_number_encrypted exists
    const { data: records, error } = await supabase
        .from('kyc_records')
        .select('id, id_number_encrypted')
        .is('pan_number', null)
        .not('id_number_encrypted', 'is', null);

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    console.log(`Found ${records.length} records to fix`);

    for (const record of records) {
        if (!record.id_number_encrypted) continue;
        const plain = decryptText(record.id_number_encrypted);
        if (plain && plain.length === 10) {
            const masked = `${plain.slice(0, 5)}****${plain.slice(9)}`;
            await supabase
                .from('kyc_records')
                .update({ pan_number: masked })
                .eq('id', record.id);
            console.log(`Fixed record ${record.id}`);
        }
    }
}

fixMaskedPANs();
