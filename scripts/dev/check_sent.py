import paramiko

host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"

query = """
SELECT u.phone, p.full_name, m.business_name, w.status
FROM whatsapp_message_logs w
JOIN user_channel_bindings u ON w.user_id = u.user_id
LEFT JOIN user_profiles p ON w.user_id = p.id
LEFT JOIN merchants m ON w.user_id = m.id
WHERE w.content_preview LIKE '%gm-broadcast:1/9/2026%'
  AND w.status = 'sent'
ORDER BY p.full_name, m.business_name;
"""

docker_cmd = f"docker exec supabase-db psql -U postgres -d postgres -t -c \"{query}\""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=user, password=password)
stdin, stdout, stderr = client.exec_command(docker_cmd)
print(stdout.read().decode('utf-8'))
client.close()
