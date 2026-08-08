import paramiko

HOST = '187.124.98.130'
USER = 'intrustindia'
PASSWORD = 'Intrustdev@2026'

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD)
    
    cmd = "docker exec -i supabase-db psql -U postgres -d postgres -t -c \"SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'crm_leads';\""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode('utf-8'))
    print("STDERR:", stderr.read().decode('utf-8'))
    ssh.close()

if __name__ == '__main__':
    main()
