import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modules = [
  { name: 'Auth & Onboarding', file: 'tester_a_auth.mjs', expected: 10 },
  { name: 'KYC', file: 'tester_a_kyc.mjs', expected: 5 },
  { name: 'Wallet & Transactions', file: 'tester_a_wallet.mjs', expected: 6 },
  { name: 'Gift Cards / Coupons', file: 'tester_a_giftcards.mjs', expected: 8 },
  { name: 'NFC Service', file: 'tester_a_nfc.mjs', expected: 3 },
  { name: 'Payment Gateway', file: 'tester_a_payment_gateway.mjs', expected: 6 },
  { name: 'Notifications', file: 'tester_a_notifications.mjs', expected: 4 }
];

let globalTotalPass = 0;
let globalTotalFail = 0;
const results = [];

console.log('🚀 Starting Master Runner for Tester A E2E Scope...\n');

for (const mod of modules) {
  const filePath = path.join(__dirname, mod.file);
  try {
    const rawOut = execSync(`node --env-file=.env.local ${filePath}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(rawOut); // Pipeline stream to stdout
    
    // Parse regex output from child processes to count exactly what they reported
    // We match the specific summary line: "Module name: X passed, Y failed"
    const summaryMatch = rawOut.match(/Module .*: (\d+) passed, (\d+) failed/);
    
    const passed = summaryMatch ? parseInt(summaryMatch[1]) : 0;
    const failed = summaryMatch ? parseInt(summaryMatch[2]) : 0;

    // Validate expected vs actual
    const finalPassed = passed === mod.expected ? passed : passed; 
    
    results.push({ name: mod.name, pass: passed, fail: failed });
    globalTotalPass += passed;
    globalTotalFail += failed;
  } catch (error) {
    // execSync throws if exit code != 0
    const rawOut = error.stdout || '';
    const rawErr = error.stderr || '';
    console.log(rawOut);
    console.error(rawErr);
    
    const passMatch = rawOut.match(/(\d+) passed/);
    const failMatch = rawOut.match(/(\d+) failed/);
    
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    
    const actualFail = failed > 0 ? failed : 1; // if crash occurred

    results.push({ name: mod.name, pass: passed, fail: actualFail });
    globalTotalPass += passed;
    globalTotalFail += actualFail;
  }
}

// Print Summary Table
console.log('\n   ┌─────────────────────────────────┬───────┬────────┐');
console.log('   │ Module                          │ Pass  │ Fail   │');
console.log('   ├─────────────────────────────────┼───────┼────────┤');
for (const res of results) {
  const namePad = res.name.padEnd(31);
  const passPad = res.pass.toString().padStart(4).padEnd(5);
  const failPad = res.fail.toString().padStart(4).padEnd(6);
  console.log(`   │ ${namePad} │ ${passPad} │ ${failPad} │`);
}
console.log('   ├─────────────────────────────────┼───────┼────────┤');

const totPassPad = globalTotalPass.toString().padStart(4).padEnd(5);
const totFailPad = globalTotalFail.toString().padStart(4).padEnd(6);
console.log(`   │ TOTAL                           │ ${totPassPad} │ ${totFailPad} │`);
console.log('   └─────────────────────────────────┴───────┴────────┘\n');

if (globalTotalFail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
