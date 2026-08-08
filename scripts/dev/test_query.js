import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000'; // We need the actual URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// I'll just write a standard fetch to see if PostgREST accepts `.not('assigned_to', 'is', null)`
async function run() {
    const res = await fetch(`http://187.124.98.130:8000/rest/v1/crm_leads?assigned_to=not.is.null&select=*`, {
        headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fake',
            'Authorization': 'Bearer fake'
        }
    });
    console.log(res.status, await res.text());
}
run();
