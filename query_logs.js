const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('whatsapp_message_logs').select('*').order('created_at', { ascending: false }).limit(2)
  .then(({data}) => console.log(JSON.stringify(data, null, 2)));
