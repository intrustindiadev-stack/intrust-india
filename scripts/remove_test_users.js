import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const HR_TEST_USER_ID = 'e6188dcf-3241-4ab8-8c18-59510d876586';
const HR_TEST_EMAIL = 'e2e.hr2@intrust-test.com';

async function run() {
  console.log('Fetching users from auth.users...');
  
  let allUsers = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
      const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
          console.error('Error fetching users:', error);
          process.exit(1);
      }
      
      const users = usersData.users || [];
      allUsers = allUsers.concat(users);
      
      if (users.length < 1000) {
          hasMore = false;
      } else {
          page++;
      }
  }

  const testUsers = allUsers.filter(u => {
      const email = (u.email || '').toLowerCase();
      // STRICT SAFETY: Never delete the HR test account
      if (u.id === HR_TEST_USER_ID || email === HR_TEST_EMAIL) {
          return false;
      }
      return email.startsWith('tester_') ||
             email.includes('test_') ||
             email.includes('test-') ||
             email.includes('e2etest') ||
             email.includes('@example.com') ||
             email === 'admin@intrust.local';
  });

  if (testUsers.length === 0) {
      console.log('No test users found to delete (HR test account preserved).');
      return;
  }

  console.log(`Found ${testUsers.length} test user(s) to delete.`);

  for (const user of testUsers) {
      const uid = user.id;
      console.log(`Deleting test user: ${user.email} (${uid})...`);
      
      try {
          // 1. Orders & Items
          const { data: groups } = await supabaseAdmin.from('shopping_order_groups').select('id').eq('customer_id', uid);
          if (groups && groups.length > 0) {
              const gids = groups.map(g => g.id);
              await supabaseAdmin.from('shopping_order_items').delete().in('group_id', gids);
              await supabaseAdmin.from('shopping_order_groups').delete().in('id', gids);
          }
          await supabaseAdmin.from('orders').delete().eq('user_id', uid);
          await supabaseAdmin.from('shopping_cart').delete().eq('customer_id', uid);
          await supabaseAdmin.from('nfc_orders').delete().eq('user_id', uid);
          await supabaseAdmin.from('notifications').delete().eq('user_id', uid);
          await supabaseAdmin.from('udhari_requests').delete().eq('customer_id', uid);

          // 2. Merchants & Inventory
          const { data: testMerchants } = await supabaseAdmin.from('merchants').select('id').eq('user_id', uid);
          if (testMerchants && testMerchants.length > 0) {
              const mIds = testMerchants.map(m => m.id);
              await supabaseAdmin.from('shopping_order_items').delete().in('seller_id', mIds);
              await supabaseAdmin.from('merchant_inventory').delete().in('merchant_id', mIds);
              await supabaseAdmin.from('coupons').delete().in('merchant_id', mIds);
              await supabaseAdmin.from('orders').delete().in('merchant_id', mIds);
              await supabaseAdmin.from('merchants').delete().in('id', mIds);
          }

          // 3. Coupons
          await supabaseAdmin.from('coupons').delete().eq('purchased_by', uid);

          // 4. Rewards
          await supabaseAdmin.from('reward_distribution_log').delete().eq('source_user_id', uid);
          await supabaseAdmin.from('reward_transactions').delete().or(`user_id.eq.${uid},source_user_id.eq.${uid}`);
          await supabaseAdmin.from('reward_points_balance').delete().eq('user_id', uid);
          await supabaseAdmin.from('reward_daily_caps').delete().eq('user_id', uid);

          // 5. Wallets & Transactions
          await supabaseAdmin.from('customer_wallet_transactions').delete().eq('user_id', uid);
          await supabaseAdmin.from('customer_wallets').delete().eq('user_id', uid);
          await supabaseAdmin.from('transactions').delete().eq('user_id', uid);

          // 6. CRM Leads & Routing logs
          const { data: userLeads } = await supabaseAdmin.from('crm_leads').select('id').or(`created_by.eq.${uid},assigned_to.eq.${uid}`);
          if (userLeads && userLeads.length > 0) {
              const leadIds = userLeads.map(l => l.id);
              await supabaseAdmin.from('crm_lead_routing_log').delete().in('lead_id', leadIds);
              await supabaseAdmin.from('crm_leads').delete().in('id', leadIds);
          }

          // 7. KYC Records
          await supabaseAdmin.from('kyc_records').delete().eq('user_id', uid);

          // 8. Auth tokens
          if (user.email) {
              await supabaseAdmin.from('auth_tokens').delete().eq('email', user.email);
          }

          // 9. Profile & Auth user
          await supabaseAdmin.from('user_profiles').delete().eq('id', uid);
          const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(uid);
          
          if (delError) {
              console.error(`Failed to delete auth user ${user.email}:`, delError.message);
          } else {
              console.log(`Successfully deleted ${user.email}`);
          }
      } catch (err) {
          console.error(`Error cleaning up dependencies for ${user.email}:`, err.message);
      }
  }
  
  console.log('Cleanup complete.');
}

run().catch(console.error);
