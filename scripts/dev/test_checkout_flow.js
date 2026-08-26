const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = require('dotenv').config({ path: '../../.env.local' }).parsed;

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  // 1. Sign up a new customer
  const email = `test.customer.${Date.now()}@intrust-test.com`;
  const password = 'TestPass@123';
  console.log(`Signing up ${email}...`);
  const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
  if (authErr) { console.error('Auth error:', authErr); return; }
  
  const token = authData.session.access_token;
  const uid = authData.user.id;
  console.log('User created:', uid);

  // 2. Set profile address using service role to skip RLS blocks during setup if any
  const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  await adminClient.from('user_profiles').update({ address: '123 E2E St', phone: '9999999999', full_name: 'E2E Customer' }).eq('id', uid);

  // 3. Find a product
  const { data: prods } = await adminClient.from('shopping_products').select('id').gt('admin_stock', 0).limit(1);
  const prodId = prods[0].id;
  
  // 4. Add to cart
  console.log('Adding to cart...');
  await adminClient.from('shopping_cart').insert({ customer_id: uid, product_id: prodId, quantity: 1, is_platform_item: true });

  // 5. Call draft_cart_orders
  console.log('Calling draft_cart_orders...');
  const { data: draft, error: draftErr } = await supabase.rpc('draft_cart_orders', { p_customer_id: uid });
  if (draftErr) { console.error('Draft error:', draftErr); return; }
  
  console.log('Draft created:', draft);
  if (!draft.success) { console.error('Failed to create draft'); return; }

  // 6. Call SabPaisa Initiate API
  console.log('Calling SabPaisa initiate API...');
  try {
      const res = await fetch('http://localhost:3000/api/sabpaisa/initiate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            orderGroupId: draft.group_id,
            totalPaise: draft.total_paise
        })
      });
      const result = await res.json();
      console.log('SabPaisa API Response:', result);
      if (result.success || result.url) {
          console.log('E2E TEST PASSED: SabPaisa successfully reached!');
      } else {
          console.error('SabPaisa init failed.');
      }
  } catch (err) {
      console.error('SabPaisa Fetch error:', err.message);
  }
}
run();
