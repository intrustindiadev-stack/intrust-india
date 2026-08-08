import paramiko

HOST = '187.124.98.130'
USER = 'intrustindia'
PASSWORD = 'Intrustdev@2026'

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD)
    
    cmd = "docker exec -i supabase-db psql -U postgres -d postgres -t -c \"SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'crm_authorized_team_ids';\""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode('utf-8'))
    print("STDERR:", stderr.read().decode('utf-8'))
    ssh.close()

if __name__ == '__main__':
    main()
