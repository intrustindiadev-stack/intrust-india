import paramiko

HOST = '187.124.98.130'
USER = 'intrustindia'
PASSWORD = 'Intrustdev@2026'

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD)
        cmd = f'''docker exec -i supabase-db psql -U postgres -d postgres -t -A << 'EOF'
\\d public.team_service_areas
\\d public.teams
EOF
'''
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print("STDOUT:", stdout.read().decode('utf-8').strip())
        print("STDERR:", stderr.read().decode('utf-8').strip())
    finally:
        ssh.close()

if __name__ == '__main__':
    main()
