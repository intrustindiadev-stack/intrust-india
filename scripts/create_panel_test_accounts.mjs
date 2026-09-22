import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials (run with: node --env-file=.env.local scripts/create_panel_test_accounts.js)');
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = 'TestPanel#2026';
const ACCOUNTS = [
  { email: 'panel.customer@intrust-test.com', role: 'user',      fullName: 'Panel Test Customer' },
  { email: 'panel.merchant@intrust-test.com', role: 'merchant',  fullName: 'Panel Test Merchant' },
];

async function findUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const hit = (data.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if ((data.users || []).length < 1000) return null;
    page += 1;
  }
}

async function ensureAccount({ email, role, fullName }) {
  console.log(`\n=== ${email} (${role}) ===`);

  // 1. Auth user
  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
    user = data.user;
    console.log(`  created auth user ${user.id}`);
  } else {
    console.log(`  auth user exists ${user.id}`);
    // Ensure password is what we expect
    const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (pwErr) console.warn(`  password reset skipped: ${pwErr.message}`);
  }

  // 2. Profile (role + name). Upsert regardless — heals missing profiles.
  const { error: profErr } = await admin
    .from('user_profiles')
    .upsert({ id: user.id, role, full_name: fullName, email }, { onConflict: 'id' });
  if (profErr) throw new Error(`profile upsert(${email}) failed: ${profErr.message}`);
  console.log(`  profile upserted (role=${role})`);

  // 3. Merchant record (merchant role only)
  if (role === 'merchant') {
    const { data: existing, error: selErr } = await admin
      .from('merchants')
      .select('id, business_name, wallet_balance_paise, status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (selErr) throw new Error(`merchant select failed: ${selErr.message}`);

    if (!existing) {
      const { data: inserted, error: insErr } = await admin
        .from('merchants')
        .insert({
          user_id: user.id,
          business_name: 'Panel Test Store',
          slug: `panel-test-store-${user.id.slice(0, 8)}`,
          status: 'approved',
          approved_at: new Date().toISOString(),
          business_type: 'retail',
          business_phone: '+919999900001',
          business_email: email,
          owner_name: fullName,
          wallet_balance_paise: 500000, // ₹5,000 — enough to wallet-pay one sponsorship slot (₹999 + GST)
          is_open: true,
        })
        .select('id, business_name, status, wallet_balance_paise')
        .single();
      if (insErr) throw new Error(`merchant insert failed: ${insErr.message}`);
      console.log(`  merchant created ${inserted.id} (wallet ₹${inserted.wallet_balance_paise / 100})`);
    } else {
      // Top up wallet if low so sponsorship wallet-payment can be tested
      if ((existing.wallet_balance_paise || 0) < 200000) {
        await admin.from('merchants').update({ wallet_balance_paise: 500000 }).eq('id', existing.id);
        console.log(`  merchant wallet topped up to ₹5,000`);
      } else {
        console.log(`  merchant exists ${existing.id} (wallet ₹${existing.wallet_balance_paise / 100})`);
      }
    }
  }

  // 4. Verify login actually works (proves clean session for manual browser test)
  const client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: loginErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (loginErr) throw new Error(`login verify(${email}) failed: ${loginErr.message}`);
  console.log(`  login verified ✓`);

  return user;
}

async function run() {
  for (const acct of ACCOUNTS) {
    await ensureAccount(acct);
  }
  console.log('\n=== TEST ACCOUNTS READY ===');
  for (const a of ACCOUNTS) {
    console.log(`  ${a.role.padEnd(9)} ${a.email} / ${PASSWORD}`);
  }
  console.log('\nNote: emails deliberately use *-test.com so scripts/remove_test_users.js will NOT delete them.');
}

run().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});
