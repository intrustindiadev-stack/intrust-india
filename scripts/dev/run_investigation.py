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
        "Source Breakdown": """
            SELECT COALESCE(source_system, 'none') as source_system, COALESCE(source, 'none') as source, 
                   COUNT(*) as lead_count, 
                   SUM(CASE WHEN pincode IS NULL AND city IS NULL AND state IS NULL THEN 1 ELSE 0 END) as missing_loc,
                   SUM(CASE WHEN pincode IS NOT NULL OR city IS NOT NULL OR state IS NOT NULL THEN 1 ELSE 0 END) as with_loc
            FROM public.crm_leads
            WHERE routing_status = 'reroute_pending'
            GROUP BY source_system, source
        """,
        "State Distribution": "SELECT COALESCE(state, 'NULL') as state, COUNT(*) FROM public.crm_leads WHERE routing_status = 'reroute_pending' GROUP BY state ORDER BY count DESC LIMIT 10",
        "City Distribution": "SELECT COALESCE(city, 'NULL') as city, COUNT(*) FROM public.crm_leads WHERE routing_status = 'reroute_pending' GROUP BY city ORDER BY count DESC LIMIT 20",
        "Pincode Distribution": "SELECT COALESCE(pincode, 'NULL') as pincode, COUNT(*) FROM public.crm_leads WHERE routing_status = 'reroute_pending' GROUP BY pincode ORDER BY count DESC LIMIT 20",
        "Service Areas": """
            SELECT t.name as team_name, tsa.area_type, tsa.value_norm, tsa.city_norm, tsa.state_norm 
            FROM public.team_service_areas tsa 
            JOIN public.teams t ON tsa.team_id = t.id
        """,
        "Creation Dates": "SELECT DATE(created_at) as created_date, COUNT(*) FROM public.crm_leads WHERE routing_status = 'reroute_pending' GROUP BY DATE(created_at) ORDER BY count DESC",
        "Import Batches": "SELECT import_batch_id IS NOT NULL as is_import, COUNT(*) FROM public.crm_leads WHERE routing_status = 'reroute_pending' GROUP BY import_batch_id IS NOT NULL",
        "Routing History": """
            SELECT reason, COUNT(*)
            FROM public.crm_lead_routing_log
            WHERE lead_id IN (SELECT id FROM public.crm_leads WHERE routing_status = 'reroute_pending')
            GROUP BY reason
        """,
        "Status History": "SELECT routing_status, COUNT(*) FROM public.crm_leads GROUP BY routing_status"
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
