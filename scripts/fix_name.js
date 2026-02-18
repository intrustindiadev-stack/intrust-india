const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local since dotenv is not installed
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envFile.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                let value = valueParts.join('=');
                value = value.replace(/\r/g, '').trim(); // Remove \r and trim
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                }
                envVars[key.trim()] = value;
            }
        });
        return envVars;
    } catch (e) {
        console.error('Could not read .env.local', e);
        return {};
    }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars in .env.local');
    // console.log('Parsed Env:', env); // Be careful not to log secrets in prod
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixName() {
    // Hardcoded ID from user_status.txt
    const userId = 'd4e0c788-1679-48c0-9291-b9cf3730477f';
    const newName = 'Ayush Malviya';

    console.log(`Updating user ${userId} to name "${newName}"...`);

    const { data, error } = await supabase
        .from('user_profiles')
        .update({ full_name: newName })
        .eq('id', userId)
        .select();

    if (error) {
        console.error('Error updating name:', error);
    } else {
        console.log('Success! Updated Data:', data);
    }
}

fixName();
