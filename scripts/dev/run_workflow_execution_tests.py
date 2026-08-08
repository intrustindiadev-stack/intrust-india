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

# TEST 4: Service Area Fix Test
test4_sql = """
BEGIN;
-- Pick an unserviced lead
SELECT id, contact_name, state, city, area, pincode, routing_status, assigned_team_id, assigned_to
FROM public.crm_leads
WHERE routing_status = 'reroute_pending'
LIMIT 1;

-- Test match before mapping
SELECT * FROM public.crm_match_team_for_location(NULL, NULL, NULL, NULL, 'TEST_STATE_TEMP');

-- Insert test service area for DEV_FINAL team (id: 2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef)
INSERT INTO public.team_service_areas (team_id, area_type, state)
VALUES ('2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef', 'state', 'TEST_STATE_TEMP')
RETURNING id;

-- Check match after mapping
SELECT * FROM public.crm_match_team_for_location(NULL, NULL, NULL, NULL, 'TEST_STATE_TEMP');

ROLLBACK;
"""

# TEST 5: Manual Assignment Test
test5_sql = """
BEGIN;
-- Pick unassigned lead
SELECT id, contact_name, assigned_to, assigned_team_id 
FROM public.crm_leads 
WHERE assigned_to IS NULL 
LIMIT 1;

-- Assign to TechnoDosz (id: 582d3d78-cf98-46af-86b8-9f133cd55e7a, team: 2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef)
UPDATE public.crm_leads 
SET assigned_to = '582d3d78-cf98-46af-86b8-9f133cd55e7a'
WHERE id = (SELECT id FROM public.crm_leads WHERE assigned_to IS NULL LIMIT 1)
RETURNING id, contact_name, assigned_to, assigned_team_id, routing_status;

ROLLBACK;
"""

# TEST 6: Employee Transfer Test
test6_sql = """
BEGIN;
-- Check current team of TechnoDosz
SELECT id, full_name, team_id FROM public.user_profiles WHERE id = '582d3d78-cf98-46af-86b8-9f133cd55e7a';

-- Check assigned leads before transfer
SELECT id, contact_name, assigned_to, assigned_team_id FROM public.crm_leads WHERE assigned_to = '582d3d78-cf98-46af-86b8-9f133cd55e7a' LIMIT 3;

-- Simulate team transfer to AASHIMA INTRUST TEAM (630fa633-dcc0-4209-afbf-de8c0bf9b0dd)
UPDATE public.user_profiles
SET team_id = '630fa633-dcc0-4209-afbf-de8c0bf9b0dd'
WHERE id = '582d3d78-cf98-46af-86b8-9f133cd55e7a';

-- Check assigned leads after transfer trigger fires
SELECT id, contact_name, assigned_to, assigned_team_id FROM public.crm_leads WHERE assigned_to = '582d3d78-cf98-46af-86b8-9f133cd55e7a' LIMIT 3;

ROLLBACK;
"""

print("=== TEST 4: Service Area Fix ===")
out, err = run_sql(test4_sql)
print(out)
if err: print("ERR:", err)

print("=== TEST 5: Manual Assignment Trigger Sync ===")
out, err = run_sql(test5_sql)
print(out)
if err: print("ERR:", err)

print("=== TEST 6: Employee Transfer Lead Sync ===")
out, err = run_sql(test6_sql)
print(out)
if err: print("ERR:", err)
