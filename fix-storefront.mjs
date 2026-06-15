import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStorefrontProducts() {
  console.log("Fetching misconfigured custom products...");
  
  // Find products that have a merchant_inventory entry but are platform_listed = true
  const { data: invData, error: invError } = await supabase
    .from('merchant_inventory')
    .select('product_id, is_platform_product');
    
  if (invError) {
    console.error("Error fetching inventory:", invError);
    return;
  }
  
  // We want to find custom products (where is_platform_product = false in merchant_inventory)
  const customProductIds = invData
    .filter(i => i.is_platform_product === false)
    .map(i => i.product_id);
    
  if (customProductIds.length === 0) {
    console.log("No custom products found.");
    return;
  }
  
  console.log(`Found ${customProductIds.length} custom product associations. Checking for incorrectly listed products...`);
  
  const { data: badProducts, error: badError } = await supabase
    .from('shopping_products')
    .select('id, title, platform_listed')
    .in('id', customProductIds)
    .eq('platform_listed', true);
    
  if (badError) {
    console.error("Error finding bad products:", badError);
    return;
  }
  
  if (badProducts.length === 0) {
    console.log("No misconfigured products found. All good!");
    return;
  }
  
  console.log(`Found ${badProducts.length} incorrectly listed custom products. Fixing...`);
  
  const badIds = badProducts.map(p => p.id);
  
  const { error: updateError } = await supabase
    .from('shopping_products')
    .update({ platform_listed: false })
    .in('id', badIds);
    
  if (updateError) {
    console.error("Error fixing products:", updateError);
    return;
  }
  
  console.log("Fix completed successfully!");
}

fixStorefrontProducts();
