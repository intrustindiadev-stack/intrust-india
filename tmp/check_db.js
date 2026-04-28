// Direct Supabase REST API check + migration runner
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ2J5bHl6bHdtbWFiZWd4bGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA1MjI2NSwiZXhwIjoyMDg1NjI4MjY1fQ._ZFcCbKGZmxFx34mbwaV9We088b1Hko-r0HKS4wsvJA';
const BASE_URL = 'https://bhgbylyzlwmmabegxlfc.supabase.co';

async function query(table, params = '') {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?${params}&limit=1`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

async function runSQL(sql) {
  // Use the Supabase SQL execution via RPC (pg_execute or similar)
  const res = await fetch(`${BASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, data: await res.text() };
}

async function main() {
  console.log('\n=== SUPABASE DB INSPECTION ===\n');

  const tables = [
    'career_applications',
    'career_job_roles', 
    'user_profiles',
    'leave_requests',
    'attendance',
    'salary_records',
    'employee_training',
  ];

  for (const t of tables) {
    const { status, data } = await query(t, 'select=*');
    if (status === 200) {
      const cols = Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : [];
      console.log(`✅ ${t} (${cols.length} cols): ${cols.join(', ') || '(empty - no rows)'}`);
    } else {
      const err = typeof data === 'string' ? data.slice(0, 100) : JSON.stringify(data).slice(0, 100);
      console.log(`❌ ${t}: ${err}`);
    }
  }

  // Try to check career_applications columns specifically with head request
  console.log('\n=== CHECKING career_applications via HEAD ===');
  const headRes = await fetch(`${BASE_URL}/rest/v1/career_applications?select=*&limit=0`, {
    method: 'GET',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'count=exact',
    },
  });
  console.log('Status:', headRes.status);
  console.log('Content-Range:', headRes.headers.get('content-range'));
  const body = await headRes.text();
  console.log('Body:', body.slice(0, 200));

  console.log('\n=== DONE ===');
}

main().catch(console.error);
