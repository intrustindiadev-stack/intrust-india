import paramiko
import sys

HOST = '187.124.98.130'
USER = 'intrustindia'
PASSWORD = 'Intrustdev@2026'

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD)
        
        with open('/home/i4yush/Desktop/intrust-india/run_tests.sql', 'r') as f:
            sql_content = f.read()

        cmd = f'''docker exec -i supabase-db psql -U postgres -d postgres << 'EOF'
{sql_content}
EOF
'''
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print("STDOUT:")
        print(stdout.read().decode('utf-8'))
        print("STDERR:")
        print(stderr.read().decode('utf-8'))
    finally:
        ssh.close()

if __name__ == '__main__':
    main()
