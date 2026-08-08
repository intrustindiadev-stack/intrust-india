import paramiko
import json
import uuid

# VPS Connection Details
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
    print("Starting Read-Only Preview for Reroute Pending Leads...")

    # Fetch all reroute_pending leads
    query_leads = """
        SELECT id, pincode, zone, area, city, state 
        FROM public.crm_leads 
        WHERE routing_status = 'reroute_pending'
    """
    leads = run_db_query(query_leads)
    if not isinstance(leads, list):
        print("Failed to fetch leads or no leads found.")
        return
        
    total_processed = len(leads)
    print(f"Total leads to process: {total_processed}")
    
    missing_location_count = 0
    unmatched_count = 0
    team_stats = {}
    
    # We could do this one by one, but that would mean 9,500 SSH commands. 
    # Instead, we will construct a single SQL query that uses the functions on the DB side!
    
    preview_sql = """
        SELECT 
            l.id,
            l.pincode, l.zone, l.area, l.city, l.state,
            m.out_team_id AS matched_team_id,
            m.out_match_type AS match_type,
            (CASE WHEN m.out_team_id IS NOT NULL THEN public.crm_pick_team_rep(m.out_team_id) ELSE NULL END) AS expected_rep_id,
            t.name AS team_name,
            u.full_name AS rep_name
        FROM public.crm_leads l
        LEFT JOIN LATERAL public.crm_match_team_for_location(l.pincode, l.zone, l.area, l.city, l.state) m ON true
        LEFT JOIN public.teams t ON m.out_team_id = t.id
        LEFT JOIN public.user_profiles u ON (CASE WHEN m.out_team_id IS NOT NULL THEN public.crm_pick_team_rep(m.out_team_id) ELSE NULL END) = u.id
        WHERE l.routing_status = 'reroute_pending'
    """
    
    print("Executing batch evaluation query...")
    results = run_db_query(preview_sql)
    
    if not isinstance(results, list):
        print("Failed to evaluate leads.")
        return
        
    for row in results:
        if not row['pincode'] and not row['zone'] and not row['area'] and not row['city'] and not row['state']:
            missing_location_count += 1
            
        team_id = row['matched_team_id']
        rep_id = row['expected_rep_id']
        team_name = row['team_name'] or 'Unknown Team'
        
        if not team_id:
            unmatched_count += 1
        else:
            if team_id not in team_stats:
                team_stats[team_id] = {
                    'name': team_name,
                    'count': 0,
                    'reps_assigned': 0,
                    'team_pool': 0
                }
                
            team_stats[team_id]['count'] += 1
            if rep_id:
                team_stats[team_id]['reps_assigned'] += 1
            else:
                team_stats[team_id]['team_pool'] += 1
                
    # Generate Report
    print("\\n==================================================")
    print("               REROUTE PREVIEW REPORT               ")
    print("==================================================\\n")
    print(f"Total Pending: {total_processed}")
    print(f"Leads with Missing Location Data: {missing_location_count}")
    print(f"Unmatched Leads (Coverage Failures): {unmatched_count}\\n")
    print("Team Distribution:")
    
    for t_id, stats in team_stats.items():
        print(f"  {stats['name']}")
        print(f"    -> {stats['count']} leads")
        print(f"    -> {stats['reps_assigned']} reps assigned")
        print(f"    -> {stats['team_pool']} team pool\\n")
        
if __name__ == '__main__':
    main()
