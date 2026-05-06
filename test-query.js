import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
    console.log('Testing queries...');
    const { data, error } = await supabase
        .from('merchant_tree_paths')
        .select(`
            descendant_id,
            merchants:descendant_id (
                business_name,
                status,
                subscription_status,
                created_at
            )
        `)
        .limit(1);
    
    console.log('Data:', data);
    if (error) console.error('Error:', error);
}

test();
