import paramiko
import json

HOST = '187.124.98.130'
USER = 'intrustindia'
PASSWORD = 'Intrustdev@2026'

def run_db_query(sql_query, fetch=True):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD)
        if fetch:
            cmd = f'''docker exec -i supabase-db psql -U postgres -d postgres -t -A << 'EOF'
WITH query_results AS (
{sql_query}
)
SELECT json_agg(query_results) FROM query_results;
EOF
'''
        else:
            cmd = f'''docker exec -i supabase-db psql -U postgres -d postgres -t -A << 'EOF'
{sql_query}
EOF
'''
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        
        if error and not output:
            print("DB Error:", error)
            
        if not fetch:
            return output
            
        if output:
            try:
                if output.lower() == 'null':
                    return []
                return json.loads(output)
            except Exception as e:
                return output
        return []
    finally:
        ssh.close()

def main():
    print("1. Inspecting active teams")
    teams = run_db_query("""
        SELECT id, name, description, region_level, state, city, area 
        FROM public.teams 
        WHERE is_active = true
    """)
    for t in teams:
        print(f"Team: {t['name']} (ID: {t['id']}) - Region: {t['region_level']} - Desc: {t['description']}")
        
    print("\\n2. Inspecting team service areas")
    areas = run_db_query("""
        SELECT t.name, a.area_type, a.value, a.city, a.state
        FROM public.team_service_areas a
        JOIN public.teams t ON a.team_id = t.id
        WHERE t.is_active = true
    """)
    for a in areas:
        print(f"Team: {a['name']}, Type: {a['area_type']}, Val: {a['value']}")

    print("\\n3. Inspecting crm_match_team_for_location definition")
    func_def = run_db_query("""
        SELECT pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'crm_match_team_for_location'
    """)
    if func_def:
        print(func_def[0]['definition'])
        
if __name__ == '__main__':
    main()
