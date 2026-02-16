const { createClient } = require('@supabase/supabase-js');
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

async function check() {
    let output = '--- CHECKING RECENT USERS ---\n';

    const { data: { users }, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 3,
        sortBy: { field: 'created_at', direction: 'desc' }
    });

    if (error) {
        output += `Error: ${error.message}\n`;
    } else if (!users || users.length === 0) {
        output += 'No users found.\n';
    } else {
        const now = new Date();
        for (const u of users) {
            const created = new Date(u.created_at);
            const ageSeconds = Math.round((now - created) / 1000);

            output += `User ID: ${u.id}\n`;
            output += `Phone: ${u.phone}\n`;
            output += `Created: ${u.created_at} (${ageSeconds}s ago)\n`;
            output += `Last Sign In: ${u.last_sign_in_at}\n`;

            const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', u.id).single();
            output += `Profile Name: ${profile?.full_name || 'N/A'}\n`;
            output += `Profile Role: ${profile?.role || 'N/A'}\n`;
            output += '------------------------------\n';
        }
    }

    fs.writeFileSync(path.resolve(__dirname, '../user_status.txt'), output);
    console.log('Done writing to user_status.txt');
}

check();
