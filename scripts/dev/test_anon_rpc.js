const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
env.forEach(line => {
    if (line && !line.startsWith('#') && line.includes('=')) {
        const parts = line.split('=');
        process.env[parts[0]] = parts.slice(1).join('=');
    }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCart() {
    console.log("Calling add_to_shopping_cart anonymously...");
    const { data, error } = await supabase.rpc('add_to_shopping_cart', {
        p_customer_id: '7d5569cb-512d-4ee0-86dd-aa5230304733',
        p_inventory_id: null,
        p_product_id: 'b0bcad76-11b3-4954-8b8e-0cb386cf5336', 
        p_quantity: 1,
        p_is_platform: true
    });
    
    if (error) {
        console.error("RPC Error:", JSON.stringify(error, null, 2));
    } else {
        console.log("RPC Success:", data);
    }
}

testCart();
