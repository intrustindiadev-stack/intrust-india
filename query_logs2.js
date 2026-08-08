const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Custom mini env parser
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) acc[match[1].trim()] = match[2].trim().split(' #')[0];
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('whatsapp_message_logs').select('created_at, error_message, error_code, payload_sent').order('created_at', { ascending: false }).limit(3)
  .then(({data}) => console.log(JSON.stringify(data, null, 2)));
