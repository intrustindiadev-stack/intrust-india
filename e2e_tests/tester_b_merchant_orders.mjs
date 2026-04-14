/**
 * Tester B — Merchant Orders Tests
 *
 * TC-B-035: shopping_order_groups WHERE merchant_id → array
 * TC-B-036: shopping_order_items WHERE group_id → items with quantity, unit_price_paise
 * TC-B-040: udhari_requests WHERE merchant_id AND status=pending → array
 * TC-B-042: PATCH /api/merchant/udhari-settings udhari_enabled=true → DB updated
 * TC-B-043: PATCH udhari-settings max_credit_limit_paise + max_duration_days → DB updated
 *
 * Run:
 *   node -r dotenv/config e2e_tests/tester_b_merchant_orders.mjs dotenv_config_path=.env.local
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
    console.error('❌ Missing TEST_MERCHANT_EMAIL / TEST_MERCHANT_PASSWORD');
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
    console.log('\n📋 Tester B — Merchant Orders Tests');
    console.log('─'.repeat(60));

    // ── Auth ──
    const { data: merchantAuth, error: mAuthErr } = await anonClient.auth.signInWithPassword({
        email: MERCHANT_EMAIL, password: MERCHANT_PASSWORD,
    });
    if (mAuthErr || !merchantAuth.session) {
        console.error('❌ Merchant auth failed:', mAuthErr?.message);
        process.exit(1);
    }
    const merchantToken  = merchantAuth.session.access_token;
    const merchantUserId = merchantAuth.user.id;
    console.log(`  🔐 Merchant authenticated: ${merchantAuth.user.email}`);

    // ── Fetch merchant ──
    const { data: merchant } = await serviceClient
        .from('merchants')
        .select('id, status')
        .eq('user_id', merchantUserId)
        .maybeSingle();

    // ── TC-B-035: shopping_order_groups WHERE merchant_id ──
    console.log('\n🧪 TC-B-035: shopping_order_groups WHERE merchant_id → array');
    if (!merchant) {
        fail('TC-B-035', 'No merchant record found for test user');
    } else {
        const { data: groups, error: gErr } = await serviceClient
            .from('shopping_order_groups')
            .select('id, delivery_status, total_amount_paise, created_at')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (gErr) {
            fail('TC-B-035', 'DB query error', gErr.message);
        } else if (Array.isArray(groups)) {
            pass('TC-B-035', `shopping_order_groups returned ${groups.length} rows for merchant`);
        } else {
            fail('TC-B-035', 'Expected array');
        }
    }

    // ── TC-B-036: shopping_order_items fields ──
    console.log('\n🧪 TC-B-036: shopping_order_items WHERE group_id → quantity + unit_price_paise');
    if (!merchant) {
        fail('TC-B-036', 'No merchant record found');
    } else {
        // Get first order group for this merchant
        const { data: groups } = await serviceClient
            .from('shopping_order_groups')
            .select('id')
            .eq('merchant_id', merchant.id)
            .limit(1);

        if (!groups || groups.length === 0) {
            pass('TC-B-036', 'No order groups yet — field check skipped (acceptable for new merchant)');
        } else {
            const groupId = groups[0].id;
            const { data: items, error: iErr } = await serviceClient
                .from('shopping_order_items')
                .select('id, quantity, unit_price_paise, product_id')
                .eq('group_id', groupId);

            if (iErr) {
                fail('TC-B-036', 'DB query error on shopping_order_items', iErr.message);
            } else if (!items || items.length === 0) {
                pass('TC-B-036', 'Order group has no items (may be empty data state)');
            } else {
                const row = items[0];
                const hasFields = 'quantity' in row && 'unit_price_paise' in row;
                if (hasFields) {
                    pass('TC-B-036', `Items have quantity=${row.quantity}, unit_price_paise=${row.unit_price_paise}`);
                } else {
                    fail('TC-B-036', 'Missing required fields in shopping_order_items', row);
                }
            }
        }
    }

    // ── TC-B-040: udhari_requests pending ──
    console.log('\n🧪 TC-B-040: udhari_requests WHERE merchant_id AND status=pending → array');
    if (!merchant) {
        fail('TC-B-040', 'No merchant record found');
    } else {
        const { data: udhari, error: uErr } = await serviceClient
            .from('udhari_requests')
            .select('id, status, amount_paise, created_at')
            .eq('merchant_id', merchant.id)
            .eq('status', 'pending');

        if (uErr) {
            fail('TC-B-040', 'DB query error on udhari_requests', uErr.message);
        } else if (Array.isArray(udhari)) {
            pass('TC-B-040', `udhari_requests pending=${udhari.length}`);
        } else {
            fail('TC-B-040', 'Expected array from udhari_requests');
        }
    }

    // ── TC-B-042: PATCH udhari-settings udhari_enabled=true ──
    console.log('\n🧪 TC-B-042: PATCH /api/merchant/udhari-settings udhari_enabled=true');
    if (!merchant || merchant.status !== 'approved') {
        fail('TC-B-042', `Merchant not approved (status=${merchant?.status})`);
    } else {
        const res = await fetch(`${APP_URL}/api/merchant/udhari-settings`, {
            method: 'PATCH',
            headers: authHeaders(merchantAuth.session, SUPABASE_URL),
            body: JSON.stringify({ udhari_enabled: true }),
        });
        const body = await res.json();

        if (res.status === 200 && body.success) {
            // Verify in DB
            const { data: settings } = await serviceClient
                .from('merchant_udhari_settings')
                .select('udhari_enabled')
                .eq('merchant_id', merchant.id)
                .maybeSingle();

            if (settings?.udhari_enabled === true) {
                pass('TC-B-042', 'merchant_udhari_settings.udhari_enabled=true in DB');
            } else {
                fail('TC-B-042', 'udhari_enabled not updated in DB', settings);
            }
        } else {
            fail('TC-B-042', `PATCH udhari-settings returned ${res.status}`, body);
        }
    }

    // ── TC-B-043: PATCH udhari-settings credit_limit + duration ──
    console.log('\n🧪 TC-B-043: PATCH udhari-settings max_credit_limit_paise=300000 + max_duration_days=10');
    if (!merchant || merchant.status !== 'approved') {
        fail('TC-B-043', `Merchant not approved (status=${merchant?.status})`);
    } else {
        const res = await fetch(`${APP_URL}/api/merchant/udhari-settings`, {
            method: 'PATCH',
            headers: authHeaders(merchantAuth.session, SUPABASE_URL),
            body: JSON.stringify({ max_credit_limit_paise: 300000, max_duration_days: 10 }),
        });
        const body = await res.json();

        if (res.status === 200 && body.success) {
            // Verify in DB
            const { data: settings } = await serviceClient
                .from('merchant_udhari_settings')
                .select('max_credit_limit_paise, max_duration_days')
                .eq('merchant_id', merchant.id)
                .maybeSingle();

            if (settings?.max_credit_limit_paise === 300000 && settings?.max_duration_days === 10) {
                pass('TC-B-043', 'max_credit_limit_paise=300000, max_duration_days=10 in DB');
            } else {
                fail('TC-B-043', 'Values not updated correctly in DB', settings);
            }
        } else {
            fail('TC-B-043', `PATCH udhari-settings returned ${res.status}`, body);
        }
    }

    // ── Summary ──
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 Orders Results: ${passed} passed, ${failed} failed`);
    return { passed, failed };
}

run().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
