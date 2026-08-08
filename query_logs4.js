const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
const url = envStr.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envStr.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

fetch(`${url}/rest/v1/whatsapp_message_logs?select=created_at,error_message,payload_sent,status&order=created_at.desc&limit=3`, {
  headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
}).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2)));
