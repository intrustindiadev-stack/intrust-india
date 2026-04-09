const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function debugFetch() {
  console.log('Fetching pending products...');
  const { data, error } = await supabase
    .from('shopping_products')
    .select(`
        *,
        merchant_inventory (
            id, stock_quantity, mrp_paise, retail_price_paise,
            merchants (
                id, business_name, user_id
            )
        )
    `)
    .eq('approval_status', 'pending_approval')
    .is('deleted_at', null);

  if (error) {
    console.error('Supabase Error:', error);
  } else {
    console.log('Data returned:', JSON.stringify(data, null, 2));
    console.log('Count:', data.length);
  }
}

debugFetch();
