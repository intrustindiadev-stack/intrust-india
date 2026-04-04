const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local manually
const env = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
for (const line of env.split('\n')) {
    if (line.trim() && !line.startsWith('#')) {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
            envVars[key.trim()] = values.join('=').trim().replace(/^"/, '').replace(/"$/, '');
        }
    }
}

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking admin_tasks...");
    const { data: cols, error: currErr } = await supabase.from('admin_tasks').select('*').limit(1);
    console.log("Admin Tasks Output:", cols ? cols.length : null, currErr);

    console.log("Checking relation...");
    const { data, error } = await supabase.from('admin_tasks').select(`
        id,
        assigned_to_profile:user_profiles!admin_tasks_assigned_to_fkey(id),
        assigned_by_profile:user_profiles!admin_tasks_assigned_by_fkey(id)
    `).limit(1);

    console.log("Relation Output:", data, error);
}

check();
