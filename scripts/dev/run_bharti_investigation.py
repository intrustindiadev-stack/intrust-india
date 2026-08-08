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
        "Bharti Users": """
            SELECT id, full_name, email, role, team_id, is_suspended, created_at
            FROM public.user_profiles 
            WHERE full_name ILIKE '%bharti%' OR email ILIKE '%bharti%'
        """,
        "Teams Overview": """
            SELECT 
                t.id, t.name, t.parent_team_id, 
                u.full_name as team_lead, 
                (SELECT COUNT(*) FROM public.team_members tm WHERE tm.team_id = t.id) as member_count,
                (SELECT string_agg(tsa.area_type || ':' || tsa.value_norm, ', ') FROM public.team_service_areas tsa WHERE tsa.team_id = t.id) as service_areas,
                t.created_at
            FROM public.teams t
            LEFT JOIN public.user_profiles u ON t.team_lead_id = u.id
            ORDER BY t.created_at ASC
        """,
        "Bharti Team Memberships": """
            SELECT u.full_name, t.name as team_name, tm.role, tm.created_at
            FROM public.team_members tm
            JOIN public.teams t ON tm.team_id = t.id
            JOIN public.user_profiles u ON tm.user_id = u.id
            WHERE u.full_name ILIKE '%bharti%' OR u.email ILIKE '%bharti%'
        """,
        "All Users in Teams": """
            SELECT t.name as team_name, u.full_name, u.role, u.email
            FROM public.team_members tm
            JOIN public.teams t ON tm.team_id = t.id
            JOIN public.user_profiles u ON tm.user_id = u.id
            ORDER BY t.name, u.role
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
