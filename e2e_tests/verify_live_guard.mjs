/**
 * Verification Test: live-product guard in submit-product route.
 */

import './load_env.mjs';
import { createClient } from '@supabase/supabase-js';
import { authHeaders } from './auth_cookie.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const MERCHANT_EMAIL = process.env.TEST_MERCHANT_EMAIL;
const MERCHANT_PASSWORD = process.env.TEST_MERCHANT_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE env vars');
    process.exit(1);
}

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
    console.log('\n🧪 Testing submission route guards...');

    // 1. Auth Merchant
    const { data: mAuth, error: mAuthErr } = await anonClient.auth.signInWithPassword({
        email: MERCHANT_EMAIL, password: MERCHANT_PASSWORD,
    });
    if (mAuthErr || !mAuth.session) {
        console.error('❌ Merchant auth failed:', mAuthErr?.message);
        process.exit(1);
    }
    const merchantUserId = mAuth.user.id;

    // 2. Fetch merchant
    const { data: merchant } = await serviceClient
        .from('merchants')
        .select('id')
        .eq('user_id', merchantUserId)
        .single();

    // 3. Create a temporary product for testing
    const { data: product, error: pErr } = await serviceClient
        .from('shopping_products')
        .insert([{
            title: 'Guard Test Product',
            description: 'Test product for live guard',
            category: 'Electronics',
            wholesale_price_paise: 1000,
            submitted_by_merchant_id: merchant.id,
            approval_status: 'pending_approval'
        }])
        .select()
        .single();

    if (pErr) {
        console.error('❌ Failed to create test product:', pErr);
        process.exit(1);
    }
    console.log(`✅ Created test product ${product.id} (status: pending_approval)`);

    // 4. Test 1: Edit pending product (should succeed)
    console.log('\n🧪 Test 1: Edit PENDING product (should succeed)');
    const payload = {
        merchantId: merchant.id,
        editMode: true,
        productId: product.id,
        formData: {
            title: 'Guard Test Product EDITED',
            description: 'Edited description',
            category: 'Electronics',
            wholesale_price_paise: 2000,
            retail_price_paise: 3000,
            mrp_paise: 4000,
            stock_quantity: 5
        }
    };

    const res1 = await fetch(`${APP_URL}/api/merchant/shopping/submit-product`, {
        method: 'POST',
        headers: authHeaders(mAuth.session, SUPABASE_URL),
        body: JSON.stringify(payload)
    });
    const body1 = await res1.json();

    if (res1.status === 200 && body1.success) {
        console.log('✅ PASS: Edit pending product succeeded');
    } else {
        console.error(`❌ FAIL: Expected 200, got ${res1.status}`, body1);
    }

    // 5. Test 2: Set status to 'live' and try to edit (should fail)
    console.log('\n🧪 Test 2: Edit LIVE product (should fail with 403)');
    await serviceClient
        .from('shopping_products')
        .update({ approval_status: 'live' })
        .eq('id', product.id);

    console.log('Status updated to "live"');

    const res2 = await fetch(`${APP_URL}/api/merchant/shopping/submit-product`, {
        method: 'POST',
        headers: authHeaders(mAuth.session, SUPABASE_URL),
        body: JSON.stringify(payload)
    });
    const body2 = await res2.json();

    if (res2.status === 403 && body2.error === 'Cannot edit a live product. Contact admin to make changes.') {
        console.log('✅ PASS: Edit live product blocked with 403');
    } else {
        console.error(`❌ FAIL: Expected 403, got ${res2.status}`, body2);
    }

    // 6. Cleanup
    await serviceClient.from('merchant_inventory').delete().eq('product_id', product.id);
    await serviceClient.from('shopping_products').delete().eq('id', product.id);
    console.log('\n🧹 Cleaned up test product.');
}

run().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
