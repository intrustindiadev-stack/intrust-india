const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx === -1) return;
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!process.env[key]) {
            process.env[key] = val;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- 1. Testing user_wishlists raw query ---');
    const { data: rawData, error: rawErr } = await supabase
        .from('user_wishlists')
        .select('*')
        .limit(5);

    if (rawErr) {
        console.error('Raw query error:', rawErr);
    } else {
        console.log('Raw user_wishlists count:', rawData?.length);
        console.log('Sample row:', rawData?.[0]);
    }

    console.log('\n--- 2. Testing WishlistPage full select query ---');
    const { data: fullData, error: fullErr } = await supabase
        .from('user_wishlists')
        .select(`
            id, added_at, is_platform_item, inventory_id, variant_id,
            shopping_products ( id, slug, title, product_images, category, suggested_retail_price_paise, platform_price_paise, mrp_paise, admin_stock ),
            fashion_variants ( id, sku, size, color, fit, fabric, price_paise, compare_at_price_paise, inventory_quantity, is_active, fashion_variant_media ( image_url, is_primary ) ),
            merchants ( id, business_name ),
            merchant_inventory ( retail_price_paise, stock_quantity, is_active )
        `)
        .limit(5);

    if (fullErr) {
        console.error('Full query ERROR:', fullErr);
    } else {
        console.log('Full query SUCCESS! Rows returned:', fullData?.length);
        console.log('Sample joined row:', JSON.stringify(fullData?.[0], null, 2));
    }
}

run();
