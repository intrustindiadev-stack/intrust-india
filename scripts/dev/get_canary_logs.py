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
SELECT lead_id, reason, to_team_id, created_at 
FROM public.crm_lead_routing_log 
WHERE lead_id IN ('1846019c-55d5-49d7-80c7-645ebb900ceb', '30d314b7-f36b-4d94-bbf8-dd76271cd19f', '2a077b16-bc15-4d8d-b9a1-6239a8180a8c', 'c8ed9f14-b2d9-4d45-88ca-1e9b49963ec2', '0ad96527-6061-44bc-9cbc-2c88087de6b3', '1da6979d-9a19-4b60-b2af-460dd954a016', 'dc266c19-8406-48d9-ae81-f90637a5e2a3', 'aeb3ebc4-2b95-46a4-8ec8-4d63c026a3a8', '0e61c44c-845d-46c3-a917-65b689200c97', '5be5d0f9-efbe-4b9e-9e9d-99c18256c8de') 
ORDER BY created_at DESC 
LIMIT 20
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
