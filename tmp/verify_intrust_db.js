import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let url = '';
let key = '';

for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
}

const supabase = createClient(url, key);

async function checkDb() {
    console.log('Connecting to:', url);
    // Since we can't do list_tables easily from the js client without rpc, let's just query a known table or check if crm_leads exists
    
    // Check if crm_leads exists
    const { data: crmData, error: crmErr } = await supabase.from('crm_leads').select('*').limit(1);
    console.log('crm_leads exists?', crmErr ? crmErr.message : 'YES');

    // Check if leads exists
    const { data: leadsData, error: leadsErr } = await supabase.from('leads').select('*').limit(1);
    console.log('leads exists?', leadsErr ? leadsErr.message : 'YES');
    
    if (leadsData) console.log('leads sample:', leadsData);

    // Get all tables via postgrest meta query (sometimes possible if exposed, but usually not)
    // Let's just try to query user_profiles
    const { data: profiles, error: profErr } = await supabase.from('user_profiles').select('*').limit(1);
    console.log('user_profiles exists?', profErr ? profErr.message : 'YES');
}

checkDb();
