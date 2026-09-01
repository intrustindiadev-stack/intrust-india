host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"
docker_cmd = "docker exec supabase-db psql -U postgres -d postgres -t -c \"SELECT error_detail FROM whatsapp_message_logs WHERE error_detail LIKE '%Invalid template%' LIMIT 1;\""

import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=user, password=password)
stdin, stdout, stderr = client.exec_command(docker_cmd)
print(stdout.read().decode('utf-8').strip())
client.close()
