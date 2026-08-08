import paramiko
import json

HOST = '187.124.98.130'
USER = 'intrustindia'
PASSWORD = 'Intrustdev@2026'

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD)
        cmd = f'''docker exec -i supabase-db psql -U postgres -d postgres -t -A << 'EOF'
WITH query_results AS (
SELECT lead_id, reason, assigned_team_id, assigned_to, notes, created_at 
FROM public.crm_lead_routing_log 
ORDER BY created_at DESC 
LIMIT 10
)
SELECT json_agg(query_results) FROM query_results;
EOF
'''
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print("STDOUT:", stdout.read().decode('utf-8').strip())
        print("STDERR:", stderr.read().decode('utf-8').strip())
    finally:
        ssh.close()

if __name__ == '__main__':
    main()
