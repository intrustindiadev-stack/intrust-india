// Fast Supabase DB Summary — uses service role via REST
// Run: node tmp/db_summary.cjs

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ2J5bHl6bHdtbWFiZWd4bGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA1MjI2NSwiZXhwIjoyMDg1NjI4MjY1fQ._ZFcCbKGZmxFx34mbwaV9We088b1Hko-r0HKS4wsvJA';
const BASE = 'https://bhgbylyzlwmmabegxlfc.supabase.co';
const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': 'Bearer ' + SERVICE_KEY,
  'Content-Type': 'application/json',
};

async function probe(table) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${BASE}/rest/v1/${table}?limit=2`, { headers: HEADERS, signal: ctrl.signal });
    clearTimeout(timer);
    if (r.status === 200) {
      const d = await r.json();
      return { ok: true, rows: d.length, cols: d.length > 0 ? Object.keys(d[0]) : [] };
    }
    const t = await r.text();
    return { ok: false, msg: t.slice(0, 120) };
  } catch(e) {
    clearTimeout(timer);
    return { ok: false, msg: e.message };
  }
}

// Get column list via PostgREST OPTIONS (faster than fetching rows)
async function options(table) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${BASE}/rest/v1/${table}`, { method: 'OPTIONS', headers: HEADERS, signal: ctrl.signal });
    clearTimeout(timer);
    const def = r.headers.get('content-profile') || '';
    const t = await r.text();
    return { status: r.status, body: t.slice(0, 300) };
  } catch(e) {
    clearTimeout(timer);
    return { status: -1, body: e.message };
  }
}

const TABLES = [
  'user_profiles',
  'career_applications',
  'career_job_roles',
  'leave_requests',
  'attendance',
  'salary_records',
  'transactions',
  'merchants',
  'coupons',
  'crm_leads',
  'shopping_order_groups',
  'employee_training',
];

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     INTRUST SUPABASE DATABASE SUMMARY        ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log('Project:', BASE);
  console.log('Time:', new Date().toLocaleString('en-IN'), '\n');

  const results = [];
  for (const t of TABLES) {
    process.stdout.write(`  Checking ${t.padEnd(28)}... `);
    const r = await probe(t);
    if (r.ok) {
      console.log(`✅  ${r.rows} rows | ${r.cols.length} cols`);
      results.push({ table: t, ok: true, rows: r.rows, cols: r.cols });
    } else {
      const msg = r.msg.includes('does not exist') || r.msg.includes('schema cache') ? '❌  TABLE NOT FOUND'
                : r.msg.includes('permission denied') ? '🔒  PERMISSION DENIED (RLS)'
                : '⚠️   ' + r.msg.slice(0, 60);
      console.log(msg);
      results.push({ table: t, ok: false, msg: r.msg });
    }
  }

  // Detail view of accessible tables
  console.log('\n══════════════ COLUMN DETAILS ══════════════\n');
  for (const r of results) {
    if (r.ok && r.cols.length > 0) {
      console.log(`📋 ${r.table}:`);
      // Split into groups of 5
      for (let i = 0; i < r.cols.length; i += 5) {
        console.log('   ' + r.cols.slice(i, i+5).join('  |  '));
      }
      console.log();
    }
  }

  // Missing tables summary
  const missing = results.filter(r => !r.ok && r.msg.includes('does not exist') || !r.ok && r.msg.includes('schema cache'));
  if (missing.length > 0) {
    console.log('══════════════ MISSING TABLES ══════════════');
    missing.forEach(r => console.log('  ❌ ' + r.table));
    console.log();
  }

  console.log('══════════════ SUMMARY ══════════════');
  console.log(`  ✅ Found:   ${results.filter(r=>r.ok).length} tables`);
  console.log(`  ❌ Missing: ${missing.length} tables`);
  console.log(`  🔒 RLS:     ${results.filter(r=>!r.ok && r.msg.includes('permission')).length} tables blocked\n`);
}

main().catch(console.error);
