
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Verifying Cascading Inventory Update ---');

    // 1. Find a merchant with inventory
    const { data: merchant, error: mError } = await supabase
        .from('merchants')
        .select('id, user_id, status')
        .eq('status', 'approved')
        .limit(1)
        .single();

    if (mError || !merchant) {
        console.error('No approved merchant found for testing:', mError);
        process.exit(1);
    }

    console.log(`Using merchant ID: ${merchant.id}`);

    // Ensure they have inventory
    const { data: inventory, error: iError } = await supabase
        .from('merchant_inventory')
        .select('id, is_active')
        .eq('merchant_id', merchant.id);

    if (iError || !inventory || inventory.length === 0) {
        console.warn('Merchant has no inventory items. Creating a dummy one.');
        // Create a dummy product and inventory
        const { data: product } = await supabase
            .from('shopping_products')
            .insert({ title: 'Test Product', approval_status: 'live' })
            .select('id')
            .single();

        await supabase
            .from('merchant_inventory')
            .insert({
                merchant_id: merchant.id,
                product_id: product.id,
                is_active: true,
                retail_price_paise: 1000,
                stock_quantity: 10
            });
    }

    // 2. Suspend Merchant
    console.log('Suspending merchant...');
    // We'll use the service role to simulate the admin action if we can't easily authenticate as admin here.
    // However, the logic is in the API. So we SHOULD call the API if possible.
    // For simplicity in this script, we can also manually trigger the update logic if the API is hard to call.
    // BUT the best verification is calling the API.

    // For now, let's just trigger the same update that the API does and check the result, 
    // OR better, use the admin auth if available.

    // Given we are testing the API code change, let's call the API.
    // I'll need a way to authenticate. I'll check if I can get a session for the admin.

    // Wait, the user wants me to implement and then they will review. 
    // I can just check if the code I wrote compiles and looks correct, and maybe a simple DB check.

    // Actually, I'll just do a direct DB check to see if the logic works when triggered.
    // But wait, the logic is in the API. 

    // Let's try to call the API. I'll need an admin session.
    // I'll look at e2e_tests/auth_cookie.mjs to see how it works.
}

run();
