import paramiko
import sys

host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"

query = sys.stdin.read()

docker_cmd = f'''docker exec supabase-db psql -U postgres -d postgres -c "{query}"'''

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(hostname=host, username=user, password=password)
    stdin, stdout, stderr = client.exec_command(docker_cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out:
        print(out)
    if err:
        print("ERR:", err)
finally:
    client.close()
