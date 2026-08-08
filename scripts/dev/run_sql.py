import paramiko
import sys

host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"

query = sys.stdin.read()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(hostname=host, username=user, password=password)
    # Using SFTP to upload query file or passing escaped stdin to docker exec -i
    sftp = client.open_sftp()
    with sftp.file("/tmp/temp_query.sql", "w") as f:
        f.write(query)
    sftp.close()
    
    stdin, stdout, stderr = client.exec_command("docker exec -i supabase-db psql -U postgres -d postgres < /tmp/temp_query.sql")
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out:
        print(out)
    if err:
        print("ERR:", err)
finally:
    client.close()
