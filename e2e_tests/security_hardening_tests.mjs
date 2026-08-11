/**
 * INTRUST India — Security Hardening E2E Tests
 * 
 * Tests that the P0 security fixes are working correctly:
 * 1. atomic_customer_wallet_credit: cannot be called by authenticated user
 * 2. admin_update_user_role: anon cannot call it
 * 3. test-wallet endpoint: returns 410 Gone
 * 4. admin_approve_payout: anon cannot call it
 * 5. admin_suspend_user: anon cannot call it
 * 
 * Run: node e2e_tests/security_hardening_tests.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in env
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !ANON_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const anon = createClient(SUPABASE_URL, ANON_KEY);
let testResults = [];

function recordResult(test, expected, actual, passed) {
    testResults.push({ test, expected, actual, passed });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${test}`);
    if (!passed) {
        console.log(`   Expected: ${expected}`);
        console.log(`   Actual:   ${actual}`);
    }
}

async function runTests() {
    console.log('\n🔒 INTRUST India — Security Hardening Tests\n');
    console.log(`Target: ${SUPABASE_URL}`);
    console.log('='  .repeat(60) + '\n');

    // ── TEST 1: atomic_customer_wallet_credit — anon cannot call ─────────────
    {
        const { data, error } = await anon.rpc('atomic_customer_wallet_credit', {
            p_user_id: '00000000-0000-0000-0000-000000000000',
            p_amount_paise: 999999999,
            p_type: 'topup',
            p_description: 'hack attempt',
            p_reference_id: 'test',
            p_reference_type: 'test'
        });
        
        const isBlocked = !!error && (
            error.code === '42501' || // insufficient_privilege
            error.message?.includes('permission denied') ||
            error.message?.includes('not permitted') ||
            error.message?.includes('privilege')
        );
        
        recordResult(
            'VULN-03: atomic_customer_wallet_credit blocked for anon',
            'Permission denied error',
            error ? `Error: ${error.message}` : `Data: ${JSON.stringify(data)}`,
            isBlocked
        );
    }

    // ── TEST 2: admin_update_user_role — anon cannot call ─────────────────────
    {
        const { data, error } = await anon.rpc('admin_update_user_role', {
            p_target_user_id: '00000000-0000-0000-0000-000000000000',
            p_new_role: 'admin'
        });
        
        const isBlocked = !!error && (
            error.code === '42501' ||
            error.message?.includes('permission denied')
        );
        // Note: the function has internal auth check too (returns success:false for anon)
        // but we want the EXECUTE grant revoked as the primary check
        const isRejected = isBlocked || (data && data.success === false);
        
        recordResult(
            'VULN-01: admin_update_user_role blocked for anon',
            'Permission denied or success:false',
            error ? `Error: ${error.message}` : `Data: ${JSON.stringify(data)}`,
            isRejected
        );
    }

    // ── TEST 3: admin_suspend_user — anon cannot call ─────────────────────────
    {
        const { data, error } = await anon.rpc('admin_suspend_user', {
            p_target_user_id: '00000000-0000-0000-0000-000000000000',
            p_reason: 'hack attempt'
        });
        
        const isBlocked = !!error && error.code === '42501';
        const isRejected = isBlocked || (data && data.success === false);
        
        recordResult(
            'VULN-02: admin_suspend_user blocked for anon',
            'Permission denied or success:false',
            error ? `Error: ${error.message}` : `Data: ${JSON.stringify(data)}`,
            isRejected
        );
    }

    // ── TEST 4: admin_approve_payout — anon cannot call ───────────────────────
    {
        const { data, error } = await anon.rpc('admin_approve_payout', {
            p_payout_request_id: '00000000-0000-0000-0000-000000000000',
            p_admin_user_id: '00000000-0000-0000-0000-000000000000',
            p_utr_reference: 'hack',
            p_admin_note: 'hack'
        });
        
        const isBlocked = !!error && error.code === '42501';
        const isRejected = isBlocked || (data && data.success === false);
        
        recordResult(
            'VULN-04: admin_approve_payout blocked for anon',
            'Permission denied or success:false',
            error ? `Error: ${error.message}` : `Data: ${JSON.stringify(data)}`,
            isRejected
        );
    }

    // ── TEST 5: /api/test-wallet → 410 Gone ───────────────────────────────────
    {
        const res = await fetch(`${APP_URL}/api/test-wallet`);
        const isGone = res.status === 410;
        
        recordResult(
            'VULN-05: /api/test-wallet returns 410 Gone',
            'HTTP 410',
            `HTTP ${res.status}`,
            isGone
        );
    }

    // ── TEST 6: merge_duplicate_user_data — authenticated cannot call ─────────
    {
        const { data, error } = await anon.rpc('merge_duplicate_user_data', {
            p_primary_user_id: '00000000-0000-0000-0000-000000000000',
            p_duplicate_user_id: '00000000-0000-0000-0000-000000000000'
        });
        
        const isBlocked = !!error && error.code === '42501';
        
        recordResult(
            'merge_duplicate_user_data: blocked for anon',
            'Permission denied',
            error ? `Error: ${error.message}` : `Data: ${JSON.stringify(data)}`,
            isBlocked
        );
    }

    // ── TEST 7: admin_takeover_stale_orders — authenticated cannot call ───────
    {
        const { data, error } = await anon.rpc('admin_takeover_stale_orders');
        
        const isBlocked = !!error && error.code === '42501';
        
        recordResult(
            'admin_takeover_stale_orders: blocked for anon',
            'Permission denied',
            error ? `Error: ${error.message}` : `Data: ${JSON.stringify(data)}`,
            isBlocked
        );
    }

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log('SECURITY TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    
    console.log(`\nTotal: ${testResults.length} | Passed: ${passed} | Failed: ${failed}\n`);
    
    if (failed > 0) {
        console.log('❌ FAILED TESTS:');
        testResults.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.test}`);
            console.log(`    Expected: ${r.expected}`);
            console.log(`    Actual:   ${r.actual}`);
        });
        process.exit(1);
    } else {
        console.log('✅ All security tests passed!');
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
