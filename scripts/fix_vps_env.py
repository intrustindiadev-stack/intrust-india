import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("187.124.98.130", port=22, username="intrustindia", password="Intrustdev@2026")
client.exec_command('sed -i "s|NEXT_PUBLIC_APP_URL=http://localhost:3000|NEXT_PUBLIC_APP_URL=https://intrustindia.com|g" /var/www/intrustindia.com/app/.env.local')

cmd = "cd /var/www/intrustindia.com/app && pm2 restart intrust-india --update-env"
nvm = 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
stdin, stdout, stderr = client.exec_command(f'bash -c \'{nvm}; {cmd}\'')

print(stdout.read().decode())
print(stderr.read().decode())
client.close()
