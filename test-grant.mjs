import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: app } = await adminSupabase
    .from('career_applications')
    .select('user_id, status, full_name, email, phone')
    .not('user_id', 'is', null)
    .limit(1)
    .single();

  console.log("App:", app);

  if (app) {
     const { error: roleError } = await adminSupabase
        .from('user_profiles')
        .upsert({
            id: app.user_id,
            full_name: app.full_name || 'New Hire',
            email: app.email,
            phone: app.phone,
            role: 'relationship_exec',
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
     console.log("Upsert Error:", roleError);
  }
}
test();
