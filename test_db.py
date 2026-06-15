import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("187.124.98.130", username="intrustindia", password="Intrustdev@2026")
cmd = """
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
pm2 env 1 | grep DB_HOST
"""
stdin, stdout, stderr = c.exec_command(cmd)
print(stdout.read().decode())
