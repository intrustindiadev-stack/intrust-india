const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runSqlFile(filename) {
  console.log(`Executing ${filename}...`);
  const filePath = path.join(__dirname, 'database_scripts', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // The execute_sql RPC might not exist, but let's try standard approach or REST if we must.
  // Actually, we can use a trick: query via REST if there's a custom RPC, otherwise we have to ask the user to run it via Supabase Dashboard.
  // Since we can't run raw SQL easily via the JS client unless an RPC like 'exec_sql' exists. Let's just create a quick postgres function if needed, but it's easier to use the MCP execute_sql if it worked, which it didn't. 
  // Let's just instruct the user to run it or we can use `psql` if they have it, but they might not.
  console.log('NOTE: To apply this SQL, we need raw SQL execution capability.');
  console.log('You will need to run this file in the Supabase Dashboard SQL Editor.');
}

// Just output instructions for the user, as the node client cannot easily run arbitrary SQL.
console.log('Please execute the following files in the Supabase Dashboard SQL Editor:');
console.log('1. database_scripts/20260425_add_new_roles.sql');
console.log('2. database_scripts/20260425_crm_schema_and_rls.sql');
console.log('3. database_scripts/20260425_hrm_schema_and_rls.sql');
