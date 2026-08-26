import paramiko
import sys

def check_nginx():
    host = '187.124.98.130'
    user = 'intrustindia'
    password = 'Intrustdev@2026'

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(host, username=user, password=password, timeout=10)
        
        command = "cat /var/log/nginx/access.log | grep '/api/auth/google/callback' | tail -n 10"
        stdin, stdout, stderr = ssh.exec_command(command)
        
        print("--- STDOUT ---")
        print(stdout.read().decode('utf-8'))
        print("--- STDERR ---")
        print(stderr.read().decode('utf-8'))
        
    except Exception as e:
        print(f"Connection failed: {str(e)}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == '__main__':
    check_nginx()
