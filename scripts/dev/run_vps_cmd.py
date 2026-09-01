import paramiko
import sys

host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"

cmd = sys.stdin.read()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(hostname=host, username=user, password=password)
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out:
        print(out)
    if err:
        print("ERR:", err)
finally:
    client.close()
