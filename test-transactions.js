import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
    console.log('Testing transactions...');
    const { data, error } = await supabase
        .from('merchant_transactions')
        .select('*')
        .limit(1);
    
    console.log('Data:', data);
    if (error) console.error('Error:', error);
}

test();
