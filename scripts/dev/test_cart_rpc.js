const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCart() {
    console.log("Logging in...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: process.env.TEST_CUSTOMER_EMAIL,
        password: process.env.TEST_CUSTOMER_PASSWORD
    });

    if (authError) {
        console.error("Login failed:", authError);
        return;
    }
    
    console.log("Logged in as:", authData.user.id);
    
    // Test the 5-arg RPC
    console.log("Calling add_to_shopping_cart...");
    const { data, error } = await supabase.rpc('add_to_shopping_cart', {
        p_customer_id: authData.user.id,
        p_inventory_id: null,
        p_product_id: 'b0bcad76-11b3-4954-8b8e-0cb386cf5336', // valid platform product
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
