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

async function run() {
  console.log('Fetching users...');
  
  // Note: auth.admin.listUsers might not return all users if there are many, but usually enough for tests.
  // We'll fetch multiple pages if needed.
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
      // Match tester_a, tester_pages, or any email that strongly indicates a test user
      return email.startsWith('tester_') || email.includes('test_') || email.includes('e2etest') || email === 'admin@intrust.local';
  });

  if (testUsers.length === 0) {
      console.log('No test users found.');
      return;
  }

  console.log(`Found ${testUsers.length} test users to delete.`);

  for (const user of testUsers) {
      console.log(`Deleting user: ${user.email} (${user.id})...`);
      
      // Clean up dependent tables first to avoid foreign key errors
      await supabaseAdmin.from('crm_leads').delete().eq('created_by', user.id);
      await supabaseAdmin.from('crm_leads').delete().eq('assigned_to', user.id);
      
      const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (delError) {
          console.error(`Failed to delete ${user.email}:`, delError.message);
      } else {
          console.log(`Successfully deleted ${user.email}`);
      }
  }
  
  console.log('Cleanup complete.');
}

run().catch(console.error);
