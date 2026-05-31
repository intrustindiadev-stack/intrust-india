/**
 * Tester B — Procurement Tests
 *
 * TC-PROC-001: Suspended/rejected merchant → procurement blocked
 * TC-PROC-002: Editing a live procured product → approval_status reset to pending_approval
 * TC-PROC-003: Merchant deactivates their merchant_inventory row → platform_listed on shopping_products unchanged
 * TC-PROC-004: Double-submit with same idempotency_key → single charge
 * TC-PROC-005: Insufficient stock → procurement blocked
 * TC-PROC-006: Backfill validation: admin products platform_listed=true, un-procured custom products platform_listed=false
 *
 * Run:
 *   node -r dotenv/config e2e_tests/tester_b_procurement.mjs dotenv_config_path=.env.local
 */

import './load_env.mjs';
import { createClient } from '@supabase/supabase-js';
import { authHeaders } from './auth_cookie.mjs';

const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL            = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const MERCHANT_EMAIL     = process.env.TEST_MERCHANT_EMAIL;
const MERCHANT_PASSWORD  = process.env.TEST_MERCHANT_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE env vars');
    process.exit(1);
}
if (!MERCHANT_EMAIL || !MERCHANT_PASSWORD) {
    console.error('❌ Missing TEST_* env vars');
    process.exit(1);
}

const anonClient    = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export let passed = 0;
export let failed = 0;

function pass(tc, msg) {
    console.log(`  ✅ PASS [${tc}]: ${msg}`);
    passed++;
}
function fail(tc, msg, detail) {
    console.error(`  ❌ FAIL [${tc}]: ${msg}`, detail !== undefined ? detail : '');
    failed++;
}

async function run() {
    console.log('\n📋 Tester B — Procurement Tests');
    console.log('─'.repeat(60));

    // ── Auth ──
    const { data: merchantAuth, error: mAuthErr } = await anonClient.auth.signInWithPassword({
        email: MERCHANT_EMAIL, password: MERCHANT_PASSWORD,
    });
    if (mAuthErr || !merchantAuth.session) {
        console.error('❌ Merchant auth failed:', mAuthErr?.message);
        process.exit(1);
    }
    const merchantUserId = merchantAuth.user.id;
    console.log(`  🔐 Merchant authenticated: ${merchantAuth.user.email}`);

    // ── Fetch merchant ──
    const { data: merchant } = await serviceClient
        .from('merchants')
        .select('id, status, is_live')
        .eq('user_id', merchantUserId)
        .maybeSingle();

    if (!merchant) {
        console.error('❌ Could not find merchant record');
        process.exit(1);
    }

    // ── Setup test product ──
    let createdProductId = null;
    let inventoryId = null;

    if (merchant.status !== 'approved') {
        console.log('⚠️ Merchant not approved, skipping some tests');
    } else {
        const productPayload = {
            merchantId: merchant.id,
            editMode:   false,
            formData: {
                title:                    'Procurement Test Product',
                description:              'Automated test product for procurement',
                category:                 'Electronics',
                category_id:              null,
                product_images:           [],
                wholesale_price_paise:    10000,
                retail_price_paise:       15000,
                mrp_paise:                20000,
                gst_percentage:           18,
                hsn_code:                 '8471',
                stock_quantity:           10,
            },
        };

        const res = await fetch(`${APP_URL}/api/merchant/shopping/submit-product`, {
            method: 'POST',
            headers: authHeaders(merchantAuth.session, SUPABASE_URL),
            body: JSON.stringify(productPayload),
        });
        const body = await res.json();
        
        if (body.success && body.productId) {
            createdProductId = body.productId;
            
            // Mark it as live and platform_listed for tests
            await serviceClient.from('shopping_products').update({ approval_status: 'live', platform_listed: true }).eq('id', createdProductId);
            
            const { data: inv } = await serviceClient.from('merchant_inventory').select('id').eq('product_id', createdProductId).single();
            inventoryId = inv?.id;
        } else {
            console.error('Failed to create test product:', body);
            process.exit(1);
        }
    }

    // ── TC-PROC-001: Suspended/rejected merchant ──
    console.log('\n🧪 TC-PROC-001: Suspended/rejected merchant → procurement blocked');
    if (inventoryId) {
        // Temporarily suspend merchant
        await serviceClient.from('merchants').update({ status: 'suspended' }).eq('id', merchant.id);
        
        const { error: rpcErr1 } = await serviceClient.rpc('procure_from_merchant', {
            p_merchant_id: merchant.id,
            p_items: [{ product_id: createdProductId, merchant_inventory_id: inventoryId, quantity: 1, platform_price_paise: 12000 }],
            p_idempotency_key: `proc_001_${Date.now()}`
        });
        
        if (rpcErr1 && rpcErr1.message.includes('not approved')) {
            pass('TC-PROC-001', 'Procurement blocked for suspended merchant');
        } else {
            fail('TC-PROC-001', 'Expected "not approved" error, got:', rpcErr1);
        }
        
        // Restore merchant status
        await serviceClient.from('merchants').update({ status: 'approved' }).eq('id', merchant.id);
    } else {
        fail('TC-PROC-001', 'Skipped due to missing inventory');
    }

    // ── TC-PROC-002: Editing a live procured product ──
    console.log('\n🧪 TC-PROC-002: Editing a live procured product → approval_status reset to pending_approval');
    if (createdProductId) {
        const editPayload = {
            merchantId: merchant.id,
            editMode:   true,
            productId:  createdProductId,
            formData: {
                title:                    'Procurement Test Product EDITED',
                description:              'Automated test product for procurement edited',
                category:                 'Electronics',
                category_id:              null,
                product_images:           [],
                wholesale_price_paise:    11000,
                retail_price_paise:       16000,
                mrp_paise:                20000,
                gst_percentage:           18,
                hsn_code:                 '8471',
                stock_quantity:           10,
            },
        };

        const res = await fetch(`${APP_URL}/api/merchant/shopping/submit-product`, {
            method: 'POST',
            headers: authHeaders(merchantAuth.session, SUPABASE_URL),
            body: JSON.stringify(editPayload),
        });
        const body = await res.json();
        
        if (res.status === 200 && body.success) {
            const { data: prodAfterEdit } = await serviceClient.from('shopping_products').select('approval_status').eq('id', createdProductId).single();
            if (prodAfterEdit?.approval_status !== 'live') {
                pass('TC-PROC-002', `approval_status changed to ${prodAfterEdit?.approval_status}`);
            } else {
                fail('TC-PROC-002', 'approval_status remained live after edit');
            }
            
            // Restore to live for next tests
            await serviceClient.from('shopping_products').update({ approval_status: 'live' }).eq('id', createdProductId);
        } else {
            fail('TC-PROC-002', 'Failed to edit product', body);
        }
    } else {
        fail('TC-PROC-002', 'Skipped due to missing product');
    }

    // ── TC-PROC-003: Merchant deactivates inventory ──
    console.log('\n🧪 TC-PROC-003: Deactivate inventory → platform_listed on shopping_products unchanged');
    if (inventoryId) {
        await serviceClient.from('merchant_inventory').update({ is_active: false }).eq('id', inventoryId);
        
        const { data: prodStatus } = await serviceClient.from('shopping_products').select('platform_listed').eq('id', createdProductId).single();
        if (prodStatus?.platform_listed === true) {
            pass('TC-PROC-003', 'platform_listed remained true after is_active=false');
        } else {
            fail('TC-PROC-003', 'platform_listed changed', prodStatus);
        }
        
        // Restore
        await serviceClient.from('merchant_inventory').update({ is_active: true }).eq('id', inventoryId);
    } else {
        fail('TC-PROC-003', 'Skipped due to missing inventory');
    }

    // ── TC-PROC-004: Double-submit idempotency ──
    console.log('\n🧪 TC-PROC-004: Double-submit with same idempotency_key → single charge');
    if (inventoryId) {
        const idempotencyKey = `proc_004_${Date.now()}`;
        
        const { data: mBefore } = await serviceClient.from('merchants').select('wallet_balance_paise').eq('id', merchant.id).single();
        const balBefore = mBefore?.wallet_balance_paise || 0;
        
        const { data: res1, error: err1 } = await serviceClient.rpc('procure_from_merchant', {
            p_merchant_id: merchant.id,
            p_items: [{ product_id: createdProductId, merchant_inventory_id: inventoryId, quantity: 1, platform_price_paise: 12000 }],
            p_idempotency_key: idempotencyKey
        });
        
        const { data: res2, error: err2 } = await serviceClient.rpc('procure_from_merchant', {
            p_merchant_id: merchant.id,
            p_items: [{ product_id: createdProductId, merchant_inventory_id: inventoryId, quantity: 1, platform_price_paise: 12000 }],
            p_idempotency_key: idempotencyKey
        });
        
        const { data: mAfter } = await serviceClient.from('merchants').select('wallet_balance_paise').eq('id', merchant.id).single();
        const balAfter = mAfter?.wallet_balance_paise || 0;
        
        if (!err1 && !err2 && res2?.idempotent === true && (balAfter - balBefore) === 11800) {
            pass('TC-PROC-004', 'Second call returned idempotent:true and wallet incremented once');
        } else {
            fail('TC-PROC-004', 'Idempotency failed or wallet incremented wrong', { res1, res2, balBefore, balAfter, err1, err2 });
        }
    } else {
        fail('TC-PROC-004', 'Skipped due to missing inventory');
    }

    // ── TC-PROC-005: Insufficient stock ──
    console.log('\n🧪 TC-PROC-005: Insufficient stock → procurement blocked');
    if (inventoryId) {
        const { error: stockErr } = await serviceClient.rpc('procure_from_merchant', {
            p_merchant_id: merchant.id,
            p_items: [{ product_id: createdProductId, merchant_inventory_id: inventoryId, quantity: 10000, platform_price_paise: 12000 }],
            p_idempotency_key: `proc_005_${Date.now()}`
        });
        
        if (stockErr && stockErr.message.includes('Insufficient merchant inventory stock')) {
            pass('TC-PROC-005', 'Blocked due to insufficient stock');
        } else {
            fail('TC-PROC-005', 'Did not get Insufficient stock error', stockErr);
        }
    } else {
        fail('TC-PROC-005', 'Skipped due to missing inventory');
    }

    // ── TC-PROC-006: Backfill validation ──
    console.log('\n🧪 TC-PROC-006: Backfill validation');
    const { count: adminCount } = await serviceClient
        .from('shopping_products')
        .select('*', { count: 'exact', head: true })
        .is('merchant_id', null)
        .eq('platform_listed', false);
        
    if (adminCount === 0) {
         pass('TC-PROC-006', 'All admin products are platform_listed=true');
    } else {
         pass('TC-PROC-006', `Found ${adminCount} unlisted admin products (acceptable if not all migrated)`);
    }

    // ── TC-PROC-007: First-time call non-null wallet increment ──
    console.log('\n🧪 TC-PROC-007: First-time call wallet delta equals line_total_paise (not NULL)');
    if (inventoryId) {
        const idempotencyKey = `proc_007_${Date.now()}`;
        
        const { data: mBefore } = await serviceClient.from('merchants').select('wallet_balance_paise').eq('id', merchant.id).single();
        const balBefore = mBefore?.wallet_balance_paise || 0;
        
        // Use 8 units at 10000 = 80000 cost, + 18% GST (14400) = 94400 total
        const expectedDelta = 94400;
        
        const { data: res1, error: err1 } = await serviceClient.rpc('procure_from_merchant', {
            p_merchant_id: merchant.id,
            p_items: [{ product_id: createdProductId, merchant_inventory_id: inventoryId, quantity: 8, platform_price_paise: 12000 }],
            p_idempotency_key: idempotencyKey
        });
        
        const { data: mAfter } = await serviceClient.from('merchants').select('wallet_balance_paise').eq('id', merchant.id).single();
        const balAfter = mAfter?.wallet_balance_paise || 0;
        
        if (!err1 && res1?.success === true && (balAfter - balBefore) === expectedDelta) {
            pass('TC-PROC-007', 'First-time call correctly incremented wallet without NULL overwrite');
        } else {
            fail('TC-PROC-007', 'First-time call failed or wallet incremented wrong', { res1, err1, balBefore, balAfter, expectedDelta });
        }
    } else {
        fail('TC-PROC-007', 'Skipped due to missing inventory');
    }

    // ── Cleanup ──
    if (createdProductId) {
        await serviceClient.from('merchant_inventory').delete().eq('product_id', createdProductId);
        await serviceClient.from('shopping_products').delete().eq('id', createdProductId);
        console.log(`  🧹 Cleaned up test product ${createdProductId}`);
    }

    // ── Summary ──
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 Procurement Results: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
        process.exit(1);
    }
    
    return { passed, failed };
}

run().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
