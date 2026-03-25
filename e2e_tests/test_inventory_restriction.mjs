/**
 * Regression Test: Platform Inventory Stock Restriction
 *
 * Tests that:
 * 1. Direct client-side `stock_quantity` updates to platform inventory items fail.
 * 2. Calling `update_merchant_inventory_stock` RPC on platform items fails.
 * 3. Calling `update_merchant_inventory_stock` RPC on CUSTOM items succeeds.
 *
 * Run:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... MERCHANT_EMAIL=... MERCHANT_PASSWORD=... node e2e_tests/test_inventory_restriction.mjs
 *
 * Or use the local .env.local by running:
 *   node -e "require('dotenv').config({ path: '.env.local' })" e2e_tests/test_inventory_restriction.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const MERCHANT_EMAIL = process.env.MERCHANT_TEST_EMAIL;
const MERCHANT_PASSWORD = process.env.MERCHANT_TEST_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    process.exit(1);
}
if (!MERCHANT_EMAIL || !MERCHANT_PASSWORD) {
    console.error('❌ Missing MERCHANT_TEST_EMAIL or MERCHANT_TEST_PASSWORD');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passed = 0;
let failed = 0;

function pass(msg) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
}

function fail(msg, detail) {
    console.error(`  ❌ FAIL: ${msg}`, detail || '');
    failed++;
}

async function run() {
    console.log('\n🔐 Authenticating merchant...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: MERCHANT_EMAIL,
        password: MERCHANT_PASSWORD,
    });
    if (authError || !authData.session) {
        console.error('Authentication failed:', authError?.message);
        process.exit(1);
    }
    console.log(`   Logged in as: ${authData.user.email}`);

    // -- Find a platform inventory item for this merchant --
    const { data: platformItems, error: piErr } = await supabase
        .from('merchant_inventory')
        .select('id, stock_quantity, is_platform_product, merchant_id')
        .eq('is_platform_product', true)
        .limit(1);

    if (piErr || !platformItems || platformItems.length === 0) {
        console.warn('⚠️  No platform inventory item found for this merchant. Skipping platform-item tests.');
    } else {
        const platformItem = platformItems[0];
        const originalStock = platformItem.stock_quantity;
        const inflatedStock = originalStock + 100;

        console.log(`\n🧪 Test 1: Direct .update() on platform item (should fail)`);
        const { error: directError } = await supabase
            .from('merchant_inventory')
            .update({ stock_quantity: inflatedStock })
            .eq('id', platformItem.id);

        if (directError) {
            pass(`Direct update blocked: ${directError.message}`);
        } else {
            // Check if the value actually changed (trigger might silently reject)
            const { data: after } = await supabase
                .from('merchant_inventory')
                .select('stock_quantity')
                .eq('id', platformItem.id)
                .single();
            if (after && after.stock_quantity === inflatedStock) {
                fail('Direct update succeeded and inflated stock — VULNERABILITY!');
            } else {
                pass('Direct update appeared to be blocked or rejected silently');
            }
        }

        console.log(`\n🧪 Test 2: RPC update_merchant_inventory_stock on platform item (should fail)`);
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_merchant_inventory_stock', {
            p_inventory_id: platformItem.id,
            p_new_stock: inflatedStock,
        });
        if (rpcError) {
            pass(`RPC call returned error: ${rpcError.message}`);
        } else if (rpcData && rpcData.success === false) {
            pass(`RPC correctly rejected: ${rpcData.message}`);
        } else {
            fail('RPC succeeded on platform product — VULNERABILITY!', rpcData);
        }
    }

    // -- Find a custom inventory item for this merchant --
    const { data: customItems, error: ciErr } = await supabase
        .from('merchant_inventory')
        .select('id, stock_quantity, is_platform_product')
        .eq('is_platform_product', false)
        .limit(1);

    if (ciErr || !customItems || customItems.length === 0) {
        console.warn('⚠️  No custom inventory item found. Skipping custom-item test.');
    } else {
        const customItem = customItems[0];
        const newStock = customItem.stock_quantity + 5;

        console.log(`\n🧪 Test 3: RPC update_merchant_inventory_stock on custom item (should succeed)`);
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_merchant_inventory_stock', {
            p_inventory_id: customItem.id,
            p_new_stock: newStock,
        });
        if (rpcError) {
            fail(`RPC errored on custom item: ${rpcError.message}`);
        } else if (rpcData && rpcData.success === true) {
            pass(`Custom item stock updated successfully to ${newStock}`);

            // Restore original value
            await supabase.rpc('update_merchant_inventory_stock', {
                p_inventory_id: customItem.id,
                p_new_stock: customItem.stock_quantity,
            });
        } else {
            fail('RPC rejected custom item stock update', rpcData);
        }
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        console.error('❌ Regression test FAILED');
        process.exit(1);
    } else {
        console.log('✅ All regression tests passed');
    }
}

run().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
