import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect("187.124.98.130", port=22, username="intrustindia", password="Intrustdev@2026")
    
    # Get raw tail - AUTH_DIAG is multi-line JSON, grep only gets the first line
    # Get the last 300 lines raw so we can see the full objects
    cmd = "tail -n 300 /home/intrustindia/.pm2/logs/intrust-india-out.log"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    out = stdout.read().decode()
    print(out)
finally:
    client.close()
