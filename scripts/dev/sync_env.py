import paramiko
import sys
import os

def sync_env():
    host = '187.124.98.130'
    user = 'intrustindia'
    password = 'Intrustdev@2026'
    
    local_env_path = '/home/i4yush/Desktop/intrust-india/.env.local'
    remote_env_path = '/var/www/intrustindia.com/app/.env'

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print("Connecting to VPS...")
        ssh.connect(host, username=user, password=password, timeout=10)
        
        sftp = ssh.open_sftp()
        print(f"Uploading {local_env_path} to {remote_env_path}...")
        sftp.put(local_env_path, remote_env_path)
        sftp.close()
        
        print("Restarting PM2...")
        command = "source ~/.nvm/nvm.sh && cd /var/www/intrustindia.com/app && pm2 restart intrust-india --update-env"
        stdin, stdout, stderr = ssh.exec_command(command)
        
        print("--- STDOUT ---")
        print(stdout.read().decode('utf-8'))
        print("--- STDERR ---")
        print(stderr.read().decode('utf-8'))
        
        print("Success!")
    except Exception as e:
        print(f"Failed: {str(e)}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == '__main__':
    sync_env()
