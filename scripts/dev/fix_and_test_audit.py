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
                return json.loads(output)
            except Exception as e:
                return output
        return []
    finally:
        ssh.close()

def main():
    print("1. Fixing Audit Trigger")
    fix_sql = """
    BEGIN;
    DROP TRIGGER IF EXISTS trg_crm_log_routing_change ON public.crm_leads;
    CREATE TRIGGER trg_crm_log_routing_change
        AFTER INSERT OR UPDATE
        ON public.crm_leads
        FOR EACH ROW
        EXECUTE FUNCTION public.crm_log_routing_change();
    COMMIT;
    """
    res = run_db_query(fix_sql, fetch=False)
    print("Fix result:", res)

    print("\\n2. Testing Audit Trigger Behavior (ROLLBACK)")
    # We will pick 1 test lead to simulate the 4 cases in a transaction and rollback.
    # Pick one of the remaining 9491 pending leads.
    test_lead = run_db_query("SELECT id FROM public.crm_leads WHERE routing_status = 'reroute_pending' LIMIT 1")
    if not test_lead:
        print("No leads to test.")
        return
    lead_id = test_lead[0]['id']
    
    test_sql = f"""
    BEGIN;
    
    -- Case C: Same team update (should not log)
    UPDATE public.crm_leads SET status = 'contacted' WHERE id = '{lead_id}';
    
    -- Case B: routing_status = reroute_pending (this forces BEFORE trigger to assign AASHIMA)
    UPDATE public.crm_leads SET routing_status = 'reroute_pending' WHERE id = '{lead_id}';
    
    -- Check logs for this lead
    SELECT reason, from_team_id, to_team_id FROM public.crm_lead_routing_log WHERE lead_id = '{lead_id}' ORDER BY created_at DESC;
    
    ROLLBACK;
    """
    test_res = run_db_query(test_sql, fetch=False)
    print("Test result (should see 1 log for team change, none for status update):")
    print(test_res)

    print("\\n3. Running 5-Lead Canary")
    canary_leads = run_db_query("SELECT id FROM public.crm_leads WHERE routing_status = 'reroute_pending' AND city = 'BHOPAL' LIMIT 5")
    canary_ids = [l['id'] for l in canary_leads]
    ids_str = ", ".join(f"'{lid}'" for lid in canary_ids)
    
    print(f"Canary IDs: {canary_ids}")
    canary_sql = f"""
        UPDATE public.crm_leads
        SET routing_status = 'reroute_pending'
        WHERE id IN ({ids_str});
    """
    res = run_db_query(canary_sql, fetch=False)
    print("Canary Update Result:", res)
    
    print("\\n4. Verifying After State")
    verify_sql = f"""
        SELECT id, assigned_team_id, assigned_to, routing_status, territory_match_type 
        FROM public.crm_leads 
        WHERE id IN ({ids_str})
    """
    after_leads = run_db_query(verify_sql)
    for lead in after_leads:
        print(f"Lead {lead['id']}: team={lead['assigned_team_id']}, rep={lead['assigned_to']}, status={lead['routing_status']}, match={lead['territory_match_type']}")
        
    print("\\n5. Verifying Canary Audit Logs")
    logs_sql = f"""
        SELECT lead_id, reason, from_team_id, to_team_id
        FROM public.crm_lead_routing_log 
        WHERE lead_id IN ({ids_str})
    """
    logs = run_db_query(logs_sql)
    for log in logs:
        print(f"Log: lead={log['lead_id']}, reason={log['reason']}, from={log['from_team_id']}, to={log['to_team_id']}")

    print("\\n6. Verifying Remaining Count")
    count_sql = "SELECT routing_status, COUNT(*) FROM public.crm_leads WHERE city = 'BHOPAL' GROUP BY routing_status"
    counts = run_db_query(count_sql)
    print("Remaining Counts:", counts)

if __name__ == '__main__':
    main()
