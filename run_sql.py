import paramiko
host = '187.124.98.130'
user = 'intrustindia'
password = 'Intrustdev@2026'

with open('test_auth.sql', 'r') as f:
    sql = f.read()

# We can copy the file to the server and execute it
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=user, password=password)

sftp = client.open_sftp()
sftp.put('test_auth.sql', '/tmp/test_auth.sql')
sftp.close()

docker_cmd = "docker cp /tmp/test_auth.sql supabase-db:/tmp/test_auth.sql && docker exec supabase-db psql -U postgres -d postgres -f /tmp/test_auth.sql"
stdin, stdout, stderr = client.exec_command(docker_cmd)
print('STDOUT:', stdout.read().decode('utf-8'))
print('STDERR:', stderr.read().decode('utf-8'))
client.close()
