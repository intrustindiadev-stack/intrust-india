import paramiko
import json
import time

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

def chunk_list(l, n):
    for i in range(0, len(l), n):
        yield l[i:i + n]

def main():
    print("Fetching remaining target leads...")
    query = """
        SELECT id FROM public.crm_leads 
        WHERE routing_status = 'reroute_pending' AND city = 'BHOPAL'
    """
    remaining_leads = run_db_query(query)
    
    if not isinstance(remaining_leads, list):
        print("Failed to fetch leads")
        return
        
    total_remaining = len(remaining_leads)
    print(f"Total leads to process: {total_remaining}")
    
    if total_remaining != 9486:
        print(f"WARNING: Expected 9486 leads, but found {total_remaining}. Proceeding with found leads.")
        
    batches = list(chunk_list([l['id'] for l in remaining_leads], 500))
    print(f"Total batches: {len(batches)}")
    
    for i, batch_ids in enumerate(batches):
        batch_num = i + 1
        print(f"\\n--- Processing Batch {batch_num}/{len(batches)} (Size: {len(batch_ids)}) ---")
        
        ids_str = ", ".join(f"'{lid}'" for lid in batch_ids)
        
        # 1. Update
        update_sql = f"""
            UPDATE public.crm_leads
            SET routing_status = 'reroute_pending'
            WHERE id IN ({ids_str});
        """
        run_db_query(update_sql, fetch=False)
        
        # 2. Verify
        verify_sql = f"""
            SELECT 
                COUNT(*) as total_processed,
                SUM(CASE WHEN routing_status = 'auto_matched' THEN 1 ELSE 0 END) as auto_matched_count,
                SUM(CASE WHEN assigned_team_id = '630fa633-dcc0-4209-afbf-de8c0bf9b0dd' THEN 1 ELSE 0 END) as aashima_count,
                SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as team_pool_count,
                SUM(CASE WHEN routing_status = 'unmatched' THEN 1 ELSE 0 END) as unmatched_count,
                SUM(CASE WHEN territory_match_type = 'city' THEN 1 ELSE 0 END) as city_match_count
            FROM public.crm_leads
            WHERE id IN ({ids_str})
        """
        verify_res = run_db_query(verify_sql)
        stats = verify_res[0] if verify_res else {}
        
        logs_sql = f"""
            SELECT COUNT(*) as log_count
            FROM public.crm_lead_routing_log
            WHERE lead_id IN ({ids_str}) AND to_team_id = '630fa633-dcc0-4209-afbf-de8c0bf9b0dd'
        """
        logs_res = run_db_query(logs_sql)
        log_count = logs_res[0]['log_count'] if logs_res else 0
        
        total_p = int(stats.get('total_processed', 0))
        auto_m = int(stats.get('auto_matched_count', 0))
        aash_m = int(stats.get('aashima_count', 0))
        pool_m = int(stats.get('team_pool_count', 0))
        unmat_m = int(stats.get('unmatched_count', 0))
        city_m = int(stats.get('city_match_count', 0))
        
        unexpected_team = total_p - aash_m
        unexpected_rep = total_p - pool_m
        
        print(f"Batch: {batch_num}")
        print(f"Processed: {total_p}")
        print(f"Successful: {auto_m}")
        print(f"Failed: {total_p - auto_m}")
        print(f"AASHIMA: {aash_m}")
        print(f"Team Pool: {pool_m}")
        print(f"Unmatched: {unmat_m}")
        print(f"Unexpected: Team={unexpected_team}, Rep={unexpected_rep}")
        print(f"Routing Logs: {log_count}")
        
        if (auto_m != total_p or aash_m != total_p or pool_m != total_p or 
            city_m != total_p or log_count != total_p):
            print("!!! BATCH VALIDATION FAILED. STOPPING SCRIPT !!!")
            return
            
    print("\\n==================================================")
    print("FINAL AUDIT")
    print("==================================================")
    
    final_audit = run_db_query("""
        SELECT 
            COUNT(*) as total_routed,
            SUM(CASE WHEN routing_status = 'auto_matched' THEN 1 ELSE 0 END) as auto_matched,
            SUM(CASE WHEN assigned_team_id = '630fa633-dcc0-4209-afbf-de8c0bf9b0dd' THEN 1 ELSE 0 END) as aashima,
            SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as assigned_to_null,
            SUM(CASE WHEN territory_match_type = 'city' THEN 1 ELSE 0 END) as city_match,
            SUM(CASE WHEN routing_status = 'reroute_pending' THEN 1 ELSE 0 END) as pending
        FROM public.crm_leads 
        WHERE city = 'BHOPAL' AND (routing_status = 'auto_matched' OR routing_status = 'reroute_pending')
    """)
    if final_audit:
        print(final_audit[0])
        
    print("\\nVerifying RLS for 9501 Leads")
    rls_audit = run_db_query("""
        SELECT 
            u.full_name,
            (SELECT COUNT(*) FROM public.crm_leads l WHERE l.city = 'BHOPAL' AND l.routing_status = 'auto_matched' AND 
            (
                (u.id = l.assigned_to) OR 
                (u.id = l.created_by) OR 
                (l.assigned_team_id IN (SELECT team_id FROM public.team_get_user_subtree(u.id)))
            )) as visible_leads
        FROM public.user_profiles u
        WHERE u.full_name IN ('Bharti Chouhan', 'TechnoDosz', 'Yogi')
    """)
    for r in rls_audit:
        print(f"{r['full_name']} can see: {r['visible_leads']} leads")
    
if __name__ == '__main__':
    main()
