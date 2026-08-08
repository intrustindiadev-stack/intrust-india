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
        cmd = f'''docker exec -i supabase-db psql -U postgres -d postgres -t -A << 'EOF'
WITH query_results AS (
{sql_query}
)
SELECT json_agg(query_results) FROM query_results;
EOF
'''
        if not fetch:
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
    print("1. DEV_FINAL Safe Check")
    dev_leads = run_db_query("SELECT COUNT(*) as count FROM public.crm_leads WHERE assigned_team_id = '2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef'")
    print(f"DEV_FINAL Leads: {dev_leads}")

    print("\\n2. AASHIMA Existing Coverage")
    aashima_cov = run_db_query("SELECT * FROM public.team_service_areas WHERE team_id = '630fa633-dcc0-4209-afbf-de8c0bf9b0dd'")
    print(f"AASHIMA Coverage: {aashima_cov}")

    print("\\n3. Target Leads Check")
    leads = run_db_query("""
        SELECT id, assigned_team_id, assigned_to, routing_status, territory_match_type, routed_at 
        FROM public.crm_leads 
        WHERE routing_status = 'reroute_pending' AND city = 'BHOPAL'
    """)
    print(f"Target Leads Count: {len(leads)}")
    
    if len(leads) != 9501:
        print("Count mismatch! STOPPING.")
        return
        
    print("\\n4. Exporting Snapshot")
    csv_file = 'rollback_snapshot_9501.csv'
    with open(csv_file, mode='w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['lead_id', 'assigned_team_id', 'assigned_to', 'routing_status', 'territory_match_type', 'routed_at'])
        for l in leads:
            writer.writerow([l.get('id'), l.get('assigned_team_id'), l.get('assigned_to'), l.get('routing_status'), l.get('territory_match_type'), l.get('routed_at')])
    print(f"Exported to {csv_file}. Timestamp: {datetime.datetime.now()}")
    
    print("\\n5. Applying Mutations...")
    mutation_sql = """
    BEGIN;
    DELETE FROM public.team_service_areas WHERE team_id = '2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef';
    INSERT INTO public.team_service_areas (team_id, area_type, value, city, state) 
    VALUES ('630fa633-dcc0-4209-afbf-de8c0bf9b0dd', 'city', 'bhopal', 'bhopal', NULL);
    COMMIT;
    """
    res = run_db_query(mutation_sql, fetch=False)
    print("Mutation result:", res)
    
    print("\\n6. Running New Read-Only Preview")
    preview_sql = """
        SELECT 
            m.out_team_id AS matched_team_id,
            m.out_match_type AS match_type,
            (CASE WHEN m.out_team_id IS NOT NULL THEN public.crm_pick_team_rep(m.out_team_id) ELSE NULL END) AS expected_rep_id,
            t.name AS team_name,
            COUNT(*) as lead_count
        FROM public.crm_leads l
        LEFT JOIN LATERAL public.crm_match_team_for_location(l.pincode, l.zone, l.area, l.city, l.state) m ON true
        LEFT JOIN public.teams t ON m.out_team_id = t.id
        WHERE l.routing_status = 'reroute_pending' AND l.city = 'BHOPAL'
        GROUP BY m.out_team_id, m.out_match_type, expected_rep_id, t.name
    """
    preview = run_db_query(preview_sql)
    for p in preview:
        print(p)
        
    print("\\n7. Check RLS Visibility")
    rls = run_db_query("""
        SELECT 
            u.full_name,
            (SELECT '630fa633-dcc0-4209-afbf-de8c0bf9b0dd'::uuid IN (SELECT team_id FROM public.team_get_user_subtree(u.id))) as can_see
        FROM public.user_profiles u
        WHERE u.full_name IN ('Bharti Chouhan', 'TechnoDosz', 'Yogi')
    """)
    for r in rls:
        print(r)

if __name__ == '__main__':
    main()
