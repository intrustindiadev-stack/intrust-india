const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load env vars
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
} catch (e) {
    console.error('Error loading .env.local:', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

async function testVerify() {
    console.log('--- STARTING MANUAL VERIFY TEST ---');
    const phone = '9876543210';
    const otp = '123456';
    const hash = hashOTP(otp);

    // 1. Cleanup old OTPs/Users for this phone
    await supabase.from('otp_codes').delete().eq('phone', phone);

    // 2. Insert Test OTP
    const { error: insertError } = await supabase.from('otp_codes').insert({
        phone: phone,
        otp_hash: hash,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 mins future
        attempts: 0,
        is_used: false
    });

    if (insertError) {
        console.error('Insert OTP Error:', insertError);
        return;
    }
    console.log('Inserted test OTP.');

    // 3. Call API
    const postData = JSON.stringify({
        phone: '+91' + phone,
        otp: otp,
        full_name: 'Test Verify User'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/verify-otp',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('BODY:', data);

            // Cleanup created user via phone search
            // (Optional, maybe keep for manual check)
        });
    });

    req.on('error', (e) => {
        console.error(`Request error: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

testVerify();
