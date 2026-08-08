import paramiko
import sys

def get_vps_logs():
    host = '187.124.98.130'
    user = 'intrustindia'
    password = 'Intrustdev@2026'

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(host, username=user, password=password)
        print("Connected to VPS. Fetching PM2 logs...")
        
        # Fetch PM2 logs
        stdin, stdout, stderr = ssh.exec_command('source ~/.nvm/nvm.sh && pm2 logs intrust-india --lines 200 --nostream')
        print(stdout.read().decode())
        err = stderr.read().decode()
        if err:
            print("STDERR:", err)
            
    except Exception as e:
        print(f"Failed to connect or execute command: {e}")
    finally:
        ssh.close()

if __name__ == '__main__':
    get_vps_logs()
