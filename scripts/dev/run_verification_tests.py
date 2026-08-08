import paramiko
import sys
import json

host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"

def run_sql(sql):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=host, username=user, password=password)
        sftp = client.open_sftp()
        with sftp.file("/tmp/temp_query.sql", "w") as f:
            f.write(sql)
        sftp.close()
        
        stdin, stdout, stderr = client.exec_command("docker exec -i supabase-db psql -U postgres -d postgres < /tmp/temp_query.sql")
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        return out, err
    finally:
        client.close()

# TEST 2: Automatic Routing Test
test2_sql = """
-- Find a lead that matched to DEV_FINAL
SELECT id, contact_name, pincode, zone, area, city, state, assigned_team_id, assigned_to, routing_status, territory_match_type
FROM public.crm_leads
WHERE routing_status = 'auto_matched' AND assigned_team_id IS NOT NULL
LIMIT 1;

-- Check crm_preview_team_for_location for that lead's location
SELECT * FROM public.crm_match_team_for_location('462001', NULL, NULL, 'Bhopal', 'Madhya Pradesh');
"""

# TEST 3: Unroutable Lead Test
test3_sql = """
SELECT id, contact_name, pincode, zone, area, city, state, assigned_team_id, assigned_to, routing_status
FROM public.crm_leads
WHERE routing_status = 'reroute_pending'
LIMIT 1;
"""

# TEST 8: Routing Trace Test
test8_sql = """
SELECT l.id as lead_id, r.id as log_id, r.from_team_id, r.to_team_id, r.match_type, r.reason, r.actor_id, r.created_at
FROM public.crm_lead_routing_log r
JOIN public.crm_leads l ON r.lead_id = l.id
ORDER BY r.created_at DESC
LIMIT 5;
"""

print("=== TEST 2: Automatic Routing ===")
out, err = run_sql(test2_sql)
print(out)

print("=== TEST 3: Unroutable Lead ===")
out, err = run_sql(test3_sql)
print(out)

print("=== TEST 8: Routing Trace ===")
out, err = run_sql(test8_sql)
print(out)
