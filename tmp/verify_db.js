const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Service Role Key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('--- Database Verification ---');

  // Check table existence
  const { data: tableData, error: tableError } = await supabase
    .from('shopping_orders')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('shopping_orders table error:', tableError.message);
  } else {
    console.log('✅ shopping_orders table exists');
  }

  // Check merchant_inventory
  const { data: invData, error: invError } = await supabase
    .from('merchant_inventory')
    .select('*')
    .limit(1);

  if (invError) {
    console.error('merchant_inventory table error:', invError.message);
  } else {
    console.log('✅ merchant_inventory table exists');
  }

  // Check RPCs (by trying to call them with dummy data and seeing if it's a 404/Function not found)
  // We don't want to actually run them, just check if they are defined.
  // We can check pg_proc.
  const { data: rpcData, error: rpcError } = await supabase.rpc('purchase_platform_products', {
    p_merchant_id: '00000000-0000-0000-0000-000000000000',
    p_product_id: '00000000-0000-0000-0000-000000000000',
    p_quantity: 1
  });

  if (rpcError && rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
    console.error('❌ purchase_platform_products RPC missing');
  } else {
    console.log('✅ purchase_platform_products RPC exists (or threw validation error)');
  }

  const { data: rpc2Data, error: rpc2Error } = await supabase.rpc('customer_purchase_from_merchant', {
    p_customer_id: '00000000-0000-0000-0000-000000000000',
    p_merchant_id: '00000000-0000-0000-0000-000000000000',
    p_item_id: '00000000-0000-0000-0000-000000000000',
    p_quantity: 1
  });

  if (rpc2Error && rpc2Error.message.includes('function') && rpc2Error.message.includes('does not exist')) {
    console.error('❌ customer_purchase_from_merchant RPC missing');
  } else {
    console.log('✅ customer_purchase_from_merchant RPC exists (or threw validation error)');
  }

  process.exit(0);
}

verify();
