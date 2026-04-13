/**
 * Tester B — Merchant Dashboard Tests
 *
 * TC-B-010: GET /api/admin/analytics/summary → 200 + revenue/order data fields
 * TC-B-011: merchants.wallet_balance_paise non-negative integer
 * TC-B-016: Average merchant rating between 1 and 5
 *
 * Run:
 *   node -r dotenv/config e2e_tests/tester_b_merchant_dashboard.mjs dotenv_config_path=.env.local
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
const ADMIN_EMAIL        = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD     = process.env.TEST_ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE env vars');
    process.exit(1);
}
if (!MERCHANT_EMAIL || !MERCHANT_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
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
    console.log('\n📋 Tester B — Merchant Dashboard Tests');
    console.log('─'.repeat(60));

    // ── Authenticate merchant ──
    const { data: merchantAuth, error: mAuthErr } = await anonClient.auth.signInWithPassword({
        email: MERCHANT_EMAIL,
        password: MERCHANT_PASSWORD,
    });
    if (mAuthErr || !merchantAuth.session) {
        console.error('❌ Merchant auth failed:', mAuthErr?.message);
        process.exit(1);
    }
    const merchantUserId = merchantAuth.user.id;
    console.log(`  🔐 Merchant authenticated: ${merchantAuth.user.email}`);

    // ── Authenticate admin ──
    const { data: adminAuth, error: aAuthErr } = await anonClient.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
    });
    if (aAuthErr || !adminAuth.session) {
        console.error('❌ Admin auth failed:', aAuthErr?.message);
        process.exit(1);
    }
    const adminToken = adminAuth.session.access_token;
    console.log(`  🔐 Admin authenticated: ${adminAuth.user.email}`);

    // ── Get merchant record ──
    const { data: merchant } = await serviceClient
        .from('merchants')
        .select('id, wallet_balance_paise')
        .eq('user_id', merchantUserId)
        .maybeSingle();

    // ── TC-B-010: GET /api/admin/analytics/summary ──
    console.log('\n\u{1F9EA} TC-B-010: GET /api/admin/analytics/summary \u2192 200 + data fields');
    const summaryRes = await fetch(`${APP_URL}/api/admin/analytics/summary`, {
        method: 'GET',
        headers: authHeaders(adminAuth.session, SUPABASE_URL),
    });

    if (summaryRes.status === 200) {
        const summaryBody = await summaryRes.json();
        const hasFields = (
            summaryBody.shoppingStats !== undefined &&
            summaryBody.shoppingStats.totalRevenue !== undefined &&
            summaryBody.shoppingStats.totalOrders !== undefined &&
            Array.isArray(summaryBody.orderStatusData)
        );
        if (hasFields) {
            pass('TC-B-010', `Analytics summary OK — totalOrders=${summaryBody.shoppingStats.totalOrders}`);
        } else {
            fail('TC-B-010', 'Response missing expected fields', summaryBody);
        }
    } else {
        const body = await summaryRes.json().catch(() => ({}));
        fail('TC-B-010', `Expected 200, got ${summaryRes.status}`, body);
    }

    // ── TC-B-011: wallet_balance_paise non-negative ──
    console.log('\n🧪 TC-B-011: merchants.wallet_balance_paise is non-negative integer');
    if (!merchant) {
        fail('TC-B-011', 'No merchant record found for test merchant user');
    } else {
        const balance = merchant.wallet_balance_paise;
        if (typeof balance === 'number' && Number.isInteger(balance) && balance >= 0) {
            pass('TC-B-011', `wallet_balance_paise=${balance} (≥0)`);
        } else {
            fail('TC-B-011', `wallet_balance_paise is invalid: ${balance}`);
        }
    }

    // ── TC-B-016: Average merchant rating between 1 and 5 ──
    console.log('\n🧪 TC-B-016: Average merchant_ratings WHERE merchant_id between 1 and 5');
    if (!merchant) {
        fail('TC-B-016', 'No merchant record found');
    } else {
        const { data: ratings, error: rErr } = await serviceClient
            .from('merchant_ratings')
            .select('rating_value')
            .eq('merchant_id', merchant.id);

        if (rErr) {
            fail('TC-B-016', 'DB query error on merchant_ratings', rErr.message);
        } else if (!ratings || ratings.length === 0) {
            pass('TC-B-016', 'No ratings yet \u2014 skip average check (acceptable for new merchant)');
        } else {
            const avg = ratings.reduce((sum, r) => sum + (r.rating_value || 0), 0) / ratings.length;
            if (avg >= 1 && avg <= 5) {
                pass('TC-B-016', `Average rating=${avg.toFixed(2)} (${ratings.length} reviews)`);
            } else {
                fail('TC-B-016', `Average rating=${avg.toFixed(2)} is out of 1–5 range`);
            }
        }
    }

    // ── Summary ──
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📊 Dashboard Results: ${passed} passed, ${failed} failed`);
    return { passed, failed };
}

run().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
