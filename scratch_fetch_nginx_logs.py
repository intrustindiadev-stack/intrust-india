import paramiko
import sys

def get_logs():
    host = '187.124.98.130'
    user = 'intrustindia'
    password = 'Intrustdev@2026'

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(host, username=user, password=password)
        print("Connected to VPS. Fetching logs...")
        
        # Check PM2 logs for callback or payment/failure
        stdin, stdout, stderr = ssh.exec_command('source ~/.nvm/nvm.sh && pm2 logs intrust-india --lines 1000 --nostream | grep -E "sabpaisa|payment|Callback"')
        print(stdout.read().decode())
        err = stderr.read().decode()
        if err:
            print("STDERR:", err)
            
    except Exception as e:
        print(f"Failed to connect or execute command: {e}")
    finally:
        ssh.close()

if __name__ == '__main__':
    get_logs()
