/**
 * Tester B — Master Runner
 *
 * Runs all 7 Tester B test suites sequentially, aggregates pass/fail counts,
 * prints a summary table, and exits with code 1 if any test fails.
 *
 * Run:
 *   node e2e_tests/run_tester_b.mjs
 *
 * Or set env vars directly:
 *   NEXT_PUBLIC_SUPABASE_URL=... node e2e_tests/run_tester_b.mjs
 */

import './load_env.mjs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Helper: run a child process and capture result ──
function runTest(scriptPath) {
    const label = path.basename(scriptPath);
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🚀 Running: ${label}`);
    console.log('═'.repeat(70));

    const startMs = Date.now();
    const result  = spawnSync(
        process.execPath,
        [scriptPath],
        {
            stdio: ['ignore', 'inherit', 'inherit'],
            env:   {
                ...process.env,
                FORCE_COLOR: '1',
            },
            cwd: path.resolve(__dirname, '..'), // project root
        }
    );

    const elapsedMs = Date.now() - startMs;
    const exitCode  = result.status ?? 1;

    return { label, exitCode, elapsedMs };
}

// ── Test suites in execution order ──
const suites = [
    path.join(__dirname, 'tester_b_merchant_onboarding.mjs'),
    path.join(__dirname, 'tester_b_merchant_dashboard.mjs'),
    path.join(__dirname, 'tester_b_merchant_wallet.mjs'),
    path.join(__dirname, 'tester_b_merchant_inventory.mjs'),
    path.join(__dirname, 'tester_b_merchant_orders.mjs'),
    path.join(__dirname, 'tester_b_shopping_storefront.mjs'),
    path.join(__dirname, 'tester_b_admin_panel.mjs'),
];

// ── Main ──
async function main() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║          INTRUST INDIA — TESTER B E2E MASTER RUNNER                 ║');
    console.log('║  Merchant Portal · Admin Panel · Shopping Marketplace               ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log(`\n  Start time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`  App URL:    ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
    console.log(`  Supabase:   ${process.env.NEXT_PUBLIC_SUPABASE_URL || '(not set)'}\n`);

    const results = [];

    for (const suite of suites) {
        const result = runTest(suite);
        results.push(result);
    }

    // ── Summary Table ──
    const totalSuites  = results.length;
    const passedSuites = results.filter(r => r.exitCode === 0).length;
    const failedSuites = results.filter(r => r.exitCode !== 0).length;

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                      TEST SUITE SUMMARY                             ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');

    const COL1 = 45;
    const COL2 = 10;
    const COL3 = 12;

    const header = `║  ${'Suite'.padEnd(COL1)} ${'Status'.padEnd(COL2)} ${'Time (ms)'.padEnd(COL3)}║`;
    console.log(header);
    console.log(`║${'─'.repeat(68)}║`);

    for (const r of results) {
        const status  = r.exitCode === 0 ? '✅ PASS' : '❌ FAIL';
        const label   = r.label.replace('.mjs', '').padEnd(COL1);
        const elapsed = String(r.elapsedMs).padEnd(COL3);
        console.log(`║  ${label} ${status.padEnd(COL2)} ${elapsed}║`);
    }

    console.log(`║${'─'.repeat(68)}║`);
    console.log(`║  ${'TOTAL'.padEnd(COL1)} ${String(passedSuites + '/' + totalSuites + ' passed').padEnd(COL2)} ${' '.padEnd(COL3)}║`);
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    if (failedSuites > 0) {
        console.log(`\n❌ ${failedSuites} suite(s) FAILED — see output above for details.`);
        console.log(`✅ ${passedSuites} suite(s) passed.\n`);
        process.exit(1);
    } else {
        console.log(`\n✅ All ${totalSuites} test suites PASSED successfully.\n`);
        process.exit(0);
    }
}

main().catch(err => {
    console.error('\nMaster runner fatal error:', err);
    process.exit(1);
});
