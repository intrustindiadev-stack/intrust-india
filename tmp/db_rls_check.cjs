// Get career_applications + job_roles columns by using the Supabase Management API
// Uses direct HTTPS fetch with service role bypassing RLS via header

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ2J5bHl6bHdtbWFiZWd4bGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA1MjI2NSwiZXhwIjoyMDg1NjI4MjY1fQ._ZFcCbKGZmxFx34mbwaV9We088b1Hko-r0HKS4wsvJA';
const BASE = 'https://bhgbylyzlwmmabegxlfc.supabase.co';

// Bypass RLS by setting Prefer: resolution=ignore-duplicates and using the service role
// PostgREST should respect service_role for RLS bypass
async function probeServiceRole(table) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(`${BASE}/rest/v1/${table}?limit=2`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        'X-Client-Info': 'supabase-js/2.0.0',
        'Prefer': 'count=exact',
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await r.json();
    return { status: r.status, count: r.headers.get('content-range'), data };
  } catch(e) {
    clearTimeout(timer);
    return { status: -1, data: e.message };
  }
}

async function main() {
  console.log('\n=== RLS-BLOCKED TABLES (via service role) ===\n');
  
  const blocked = ['career_applications', 'career_job_roles', 'crm_leads'];
  for (const t of blocked) {
    const r = await probeServiceRole(t);
    console.log(`\n📋 ${t} (status: ${r.status}):`);
    if (Array.isArray(r.data) && r.data.length > 0) {
      const cols = Object.keys(r.data[0]);
      console.log(`   Cols (${cols.length}): ${cols.join(', ')}`);
      console.log(`   Sample rows: ${r.data.length}`);
    } else {
      console.log('   Response:', JSON.stringify(r.data).slice(0, 200));
    }
  }

  // Also check user_profiles full column list
  console.log('\n=== user_profiles ROLE CHECK ===');
  const r2 = await probeServiceRole('user_profiles');
  if (Array.isArray(r2.data)) {
    console.log('Columns:', Object.keys(r2.data[0] || {}).join(', '));
    r2.data.forEach(p => console.log('  Role:', p.role, '| Name:', p.full_name, '| Email:', p.email));
  }

  // Check what tables exist via information_schema via RPC if available
  console.log('\n=== MISSING TABLES THAT NEED TO BE CREATED ===');
  const need = ['leave_requests', 'attendance', 'salary_records', 'employee_training', 'employee_documents'];
  for (const t of need) {
    const r = await probeServiceRole(t);
    const exists = r.status === 200 || (r.status === 400 && !JSON.stringify(r.data).includes('does not exist'));
    console.log(`  ${exists ? '✅' : '❌'} ${t} (status: ${r.status})`);
  }
}

main().catch(console.error);
