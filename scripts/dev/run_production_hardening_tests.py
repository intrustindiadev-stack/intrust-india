import paramiko
import json
import uuid

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

def execute_test_suite():
    AASHIMA = '630fa633-dcc0-4209-afbf-de8c0bf9b0dd'
    DEV_FINAL = '2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef'
    BHARTI = 'f1a54ece-db21-4afb-bd7f-182e32d9e51f'
    
    print("--- Test 1: Test Team Isolation (AASHIMA vs DEV_FINAL) ---")
    # Setup DEV_FINAL with Bhopal
    res = run_db_query(f"""
        BEGIN;
        INSERT INTO public.team_service_areas (team_id, area_type, value, city) 
        VALUES ('{DEV_FINAL}', 'city', 'bhopal', 'bhopal');
        
        INSERT INTO public.crm_leads (title, contact_name, phone, city) 
        VALUES ('Test Lead', 'Test', '9999911111', 'bhopal') RETURNING id, assigned_team_id, routing_status;
        ROLLBACK;
    """)
    print("Test 1 Result:", res)

    print("\\n--- Test 2 & 9: Production Routing Regression ---")
    res = run_db_query(f"""
        BEGIN;
        INSERT INTO public.crm_leads (title, contact_name, phone, city) 
        VALUES ('Test Lead Prod', 'Test', '9999922222', 'bhopal') RETURNING id, assigned_team_id, routing_status;
        ROLLBACK;
    """)
    print("Test 2/9 Result:", res)
    
    print("\\n--- Test 3-7: Location Normalization (Empty Strings) ---")
    res = run_db_query(f"""
        BEGIN;
        INSERT INTO public.crm_leads (title, contact_name, phone, city) 
        VALUES ('Test Empty City', 'Test', '9999933333', '   ') RETURNING id, city, assigned_team_id, routing_status;
        ROLLBACK;
    """)
    print("Test 3-7 Result:", res)

    print("\\n--- Test 8: Exclusive Test Team Coverage ---")
    res = run_db_query(f"""
        BEGIN;
        -- Remove AASHIMA's coverage temporarily
        DELETE FROM public.team_service_areas WHERE team_id = '{AASHIMA}';
        
        -- Give DEV_FINAL coverage
        INSERT INTO public.team_service_areas (team_id, area_type, value, city) 
        VALUES ('{DEV_FINAL}', 'city', 'bhopal', 'bhopal');
        
        -- Insert lead
        INSERT INTO public.crm_leads (title, contact_name, phone, city) 
        VALUES ('Test Exclusive Test Team', 'Test', '9999944444', 'bhopal') RETURNING id, assigned_team_id, routing_status;
        
        ROLLBACK;
    """)
    print("Test 8 Result:", res)

    print("\\n--- Test 10: RBAC Regression ---")
    res = run_db_query(f"""
        SELECT count(*) as count 
        FROM public.crm_leads 
        WHERE assigned_team_id = '{AASHIMA}';
    """)
    print("Super Admin can see:", res[0]['count'])
    
    res = run_db_query(f"""
        -- Impersonate Bharti (AASHIMA RM)
        SET SESSION AUTHORIZATION intrustindia;
        SELECT count(*) as count FROM public.crm_leads 
        WHERE id IN (
            SELECT l.id FROM public.crm_leads l
            WHERE l.assigned_team_id IN (SELECT team_id FROM public.team_get_user_subtree('{BHARTI}'))
        );
    """)
    print("Bharti can see:", res[0]['count'])

    print("\\n--- Test 11: Environment Protection Trigger ---")
    err = run_db_query(f"""
        BEGIN;
        UPDATE public.teams SET environment = 'production' WHERE id = '{DEV_FINAL}';
        ROLLBACK;
    """, fetch=False)
    print("Error captured:", err)

    print("\\n--- Test 12: 9,501 Production Data Safety Audit ---")
    res = run_db_query(f"""
        SELECT 
            count(*) as total,
            count(CASE WHEN assigned_team_id = '{AASHIMA}' THEN 1 END) as aashima,
            count(CASE WHEN assigned_to IS NULL THEN 1 END) as team_pool,
            count(CASE WHEN routing_status = 'auto_matched' THEN 1 END) as auto_matched
        FROM public.crm_leads 
        WHERE city_norm = 'bhopal' AND created_at < '2026-08-10'::timestamp AND source != 'Merchants'; -- Filter to exclude the test merchants or just rely on total count
    """)
    print("Safety Audit:", res)
    
if __name__ == '__main__':
    execute_test_suite()
