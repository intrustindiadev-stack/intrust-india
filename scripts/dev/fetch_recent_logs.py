import paramiko
import sys

def run_ssh(command):
    host = '187.124.98.130'
    user = 'intrustindia'
    password = 'Intrustdev@2026'

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password, timeout=10)
        # Use simple sudo command
        stdin, stdout, stderr = ssh.exec_command(f"echo '{password}' | sudo -S {command}")
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out: print(out)
        if err: print("STDERR:", err)
    finally:
        ssh.close()

if __name__ == '__main__':
    print("=== Nginx Access Logs ===")
    run_ssh("grep -E '/api/sabpaisa/callback|/payment/bounce|/payment/failure|/payment/success' /var/log/nginx/access.log | tail -n 20")

    print("\n=== PM2 Logs (SabPaisa Callback) ===")
    run_ssh("grep -A 10 -B 2 -iE 'SabPaisa Callback Decrypted Data' /home/intrustindia/.pm2/logs/intrust-india-out.log | tail -n 50")
    
    print("\n=== PM2 Logs (Diagnostics) ===")
    run_ssh("grep -i 'cookieHeaderPresent' /home/intrustindia/.pm2/logs/intrust-india-out.log | tail -n 20")
