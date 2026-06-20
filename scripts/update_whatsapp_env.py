import paramiko
import sys

VPS_HOST       = "187.124.98.130"
VPS_USER       = "intrustindia"
VPS_PASSWORD   = "Intrustdev@2026"
VPS_PORT       = 22
REMOTE_APP_DIR = "/var/www/intrustindia.com/app"

def ssh_connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD,
              timeout=30, allow_agent=False, look_for_keys=False)
    return c

def run_remote(client, cmd):
    print(f"Running: {cmd}")
    NVM = 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
    full = f'bash -c \'{NVM}; {cmd}\''
    _, sout, serr = client.exec_command(full)
    status = sout.channel.recv_exit_status()
    out = sout.read().decode().strip()
    err = serr.read().decode().strip()
    if out: print(out)
    if err: print(err)
    if status != 0:
        print(f"Command failed with exit code {status}")
        sys.exit(1)

def main():
    client = ssh_connect()
    try:
        # Check if WHATSAPP_OTP_ENABLED already exists in .env.local
        check_cmd = f"grep -q 'WHATSAPP_OTP_ENABLED' {REMOTE_APP_DIR}/.env.local"
        _, sout, _ = client.exec_command(check_cmd)
        status = sout.channel.recv_exit_status()
        
        if status == 0:
            # Replace existing
            run_remote(client, f"sed -i 's/.*WHATSAPP_OTP_ENABLED.*/WHATSAPP_OTP_ENABLED=true/g' {REMOTE_APP_DIR}/.env.local")
            print("Updated existing WHATSAPP_OTP_ENABLED")
        else:
            # Append new
            run_remote(client, f"echo 'WHATSAPP_OTP_ENABLED=true' >> {REMOTE_APP_DIR}/.env.local")
            print("Appended WHATSAPP_OTP_ENABLED")
            
        # Restart pm2
        run_remote(client, f"cd {REMOTE_APP_DIR} && pm2 restart intrust-india --update-env")
        run_remote(client, "pm2 save")
        
        print("Successfully updated VPS env and restarted PM2.")
    finally:
        client.close()

if __name__ == '__main__':
    main()
