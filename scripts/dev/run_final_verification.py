import paramiko
import json

HOST = '187.124.98.130'
USER = 'intrustindia'
PASSWORD = 'Intrustdev@2026'

def run_db_query(sql_query):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD)
        cmd = f'''docker exec -i supabase-db psql -U postgres -d postgres -t -A << 'EOF'
WITH query_results AS (
{sql_query}
)
SELECT json_agg(query_results) FROM query_results;
EOF
'''
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        
        if error:
            print("DB Error:", error)
            
        if output:
            try:
                return json.loads(output)
            except Exception as e:
                return output
        return []
    finally:
        ssh.close()

def main():
    queries = {
        "Users Context": """
            SELECT full_name, id, role FROM public.user_profiles 
            WHERE full_name IN ('Bharti Chouhan', 'TechnoDosz', 'Yogi')
        """,
        "DEV_FINAL Service Areas": """
            SELECT id, team_id, area_type, value_norm, city_norm, state_norm 
            FROM public.team_service_areas 
            WHERE team_id = '2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef'
        """,
        "Simulate RLS Visibility for AASHIMA INTRUST TEAM (ID: 630fa633-dcc0-4209-afbf-de8c0bf9b0dd)": """
            SELECT 
                u.full_name,
                (SELECT '630fa633-dcc0-4209-afbf-de8c0bf9b0dd'::uuid IN (SELECT team_id FROM public.team_get_user_subtree(u.id))) as can_see_team_pool_leads
            FROM public.user_profiles u
            WHERE u.full_name IN ('Bharti Chouhan', 'TechnoDosz', 'Yogi')
        """
    }
    
    for name, q in queries.items():
        print(f"\\n--- {name} ---")
        res = run_db_query(q)
        if isinstance(res, list):
            for row in res:
                print(row)
        else:
            print(res)

if __name__ == '__main__':
    main()
