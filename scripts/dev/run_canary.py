import paramiko
import json
import csv
import datetime

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
                return json.loads(output)
            except Exception as e:
                return output
        return []
    finally:
        ssh.close()

def main():
    print("1. Selecting 10 Canary Leads")
    select_sql = """
        SELECT id, assigned_team_id, assigned_to, routing_status, territory_match_type, routed_at 
        FROM public.crm_leads 
        WHERE routing_status = 'reroute_pending' AND city = 'BHOPAL'
        LIMIT 10
    """
    canary_leads = run_db_query(select_sql)
    if not canary_leads or len(canary_leads) != 10:
        print("Failed to get 10 canary leads")
        return
        
    lead_ids = [l['id'] for l in canary_leads]
    ids_str = ", ".join(f"'{lid}'" for lid in lead_ids)
    
    print(f"Canary IDs: {lead_ids}")
    print("Before state recorded.")

    print("\\n2. Executing Mutation")
    mutation_sql = f"""
        UPDATE public.crm_leads
        SET routing_status = 'reroute_pending'
        WHERE id IN ({ids_str});
    """
    res = run_db_query(mutation_sql, fetch=False)
    print("Mutation result:", res)
    
    print("\\n3. Verifying After State")
    verify_sql = f"""
        SELECT id, assigned_team_id, assigned_to, routing_status, territory_match_type, routed_at 
        FROM public.crm_leads 
        WHERE id IN ({ids_str})
    """
    after_leads = run_db_query(verify_sql)
    for lead in after_leads:
        print(f"Lead {lead['id']}: team={lead['assigned_team_id']}, rep={lead['assigned_to']}, status={lead['routing_status']}, match={lead['territory_match_type']}")
        
    print("\\n4. Verifying Routing Logs")
    logs_sql = f"""
        SELECT lead_id, reason, assigned_team_id, assigned_to, notes, created_at 
        FROM public.crm_lead_routing_log 
        WHERE lead_id IN ({ids_str})
        ORDER BY created_at DESC
        LIMIT 20
    """
    logs = run_db_query(logs_sql)
    for log in logs:
        print(f"Log: lead={log['lead_id']}, reason={log['reason']}, team={log['assigned_team_id']}, rep={log['assigned_to']}")

    print("\\n5. Verifying RBAC Visibility")
    rbac_sql = f"""
        WITH target_leads AS (
            SELECT assigned_team_id, assigned_to, created_by
            FROM public.crm_leads WHERE id IN ({ids_str}) LIMIT 1
        )
        SELECT 
            u.full_name,
            u.role,
            (SELECT (
                (u.id = (SELECT assigned_to FROM target_leads)) OR 
                (u.id = (SELECT created_by FROM target_leads)) OR 
                ((SELECT assigned_team_id FROM target_leads) IN (SELECT team_id FROM public.team_get_user_subtree(u.id)))
            )) as can_see_leads
        FROM public.user_profiles u
        WHERE u.full_name IN ('Bharti Chouhan', 'TechnoDosz', 'Yogi')
    """
    rbac_res = run_db_query(rbac_sql)
    for r in rbac_res:
        print(r)
        
    print("\\n6. Verifying Remaining Count")
    count_sql = "SELECT routing_status, COUNT(*) FROM public.crm_leads WHERE city = 'BHOPAL' GROUP BY routing_status"
    counts = run_db_query(count_sql)
    print("Remaining Counts:", counts)

if __name__ == '__main__':
    main()
