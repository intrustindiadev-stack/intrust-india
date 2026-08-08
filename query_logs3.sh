URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)
curl -s -X GET "$URL/rest/v1/whatsapp_message_logs?select=created_at,error_message,payload_sent&order=created_at.desc&limit=3" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY"
