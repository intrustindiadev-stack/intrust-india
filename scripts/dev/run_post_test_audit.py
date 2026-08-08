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

audit_sql = """
-- 1. TEST DATA REVERSION CHECK
SELECT count(*) as test_goa_count FROM public.team_service_areas WHERE value = 'TEST_GOA' OR state = 'TEST_GOA';

SELECT u.id, u.full_name, u.role, u.team_id, t.name as team_name
FROM public.user_profiles u
LEFT JOIN public.teams t ON u.team_id = t.id
WHERE u.full_name ILIKE '%Techno%';

SELECT t.id, t.name, t.team_lead_id, u.full_name as lead_name
FROM public.teams t
LEFT JOIN public.user_profiles u ON t.team_lead_id = u.id;

-- 2. CURRENT LIVE STATE
SELECT 
    COUNT(*) FILTER (WHERE l.archived_at IS NULL AND l.source NOT IN ('Users','App User')) AS total_leads,
    COUNT(*) FILTER (WHERE l.archived_at IS NULL AND l.source NOT IN ('Users','App User') AND l.assigned_to IS NOT NULL) AS assigned_leads,
    COUNT(*) FILTER (WHERE l.archived_at IS NULL AND l.source NOT IN ('Users','App User') AND l.assigned_team_id IS NOT NULL AND l.assigned_to IS NULL) AS team_assigned_no_rep,
    COUNT(*) FILTER (WHERE l.archived_at IS NULL AND l.source NOT IN ('Users','App User') AND l.assigned_to IS NULL) AS unassigned_leads,
    COUNT(*) FILTER (WHERE l.archived_at IS NULL AND l.source NOT IN ('Users','App User') AND l.routing_status = 'reroute_pending') AS reroute_pending_leads,
    COUNT(*) FILTER (WHERE l.archived_at IS NULL AND l.source NOT IN ('Users','App User') AND l.routing_status = 'auto_matched') AS auto_matched_leads,
    COUNT(*) FILTER (WHERE l.archived_at IS NULL AND l.source NOT IN ('Users','App User') AND l.routing_status = 'manual_override') AS manual_override_leads
FROM public.crm_leads l;

SELECT COUNT(*) AS active_teams FROM public.teams WHERE is_active = true;
SELECT COUNT(DISTINCT user_id) AS active_team_members FROM public.team_members tm JOIN public.teams t ON tm.team_id = t.id WHERE t.is_active = true;
SELECT COUNT(*) AS active_service_areas FROM public.team_service_areas;

-- 3. LOCATION BREAKDOWN FOR 155 MISSING-LOCATION LEADS
SELECT 
    COUNT(*) FILTER (WHERE state IS NULL AND city IS NULL AND area IS NULL AND zone IS NULL AND pincode IS NULL) AS all_location_fields_null,
    COUNT(*) FILTER (WHERE state IS NULL) AS missing_state,
    COUNT(*) FILTER (WHERE city IS NULL) AS missing_city,
    COUNT(*) FILTER (WHERE area IS NULL) AS missing_area,
    COUNT(*) FILTER (WHERE zone IS NULL) AS missing_zone,
    COUNT(*) FILTER (WHERE pincode IS NULL) AS missing_pincode,
    COUNT(*) FILTER (WHERE (state IS NOT NULL OR city IS NOT NULL OR pincode IS NOT NULL) AND routing_status = 'reroute_pending') AS has_some_location_pending
FROM public.crm_leads
WHERE archived_at IS NULL AND source NOT IN ('Users','App User');

-- 4. INVESTIGATE 23 TEAM-ASSIGNED / NO-EMPLOYEE LEADS
SELECT l.id, l.contact_name, l.assigned_team_id, t.name as team_name, l.routing_status, l.territory_match_type, l.pincode, l.city, l.state
FROM public.crm_leads l
JOIN public.teams t ON l.assigned_team_id = t.id
WHERE l.archived_at IS NULL AND l.source NOT IN ('Users','App User') AND l.assigned_team_id IS NOT NULL AND l.assigned_to IS NULL
LIMIT 10;

-- 5 & 6. PREVIEW REROUTE CALCULATIONS
-- How many reroute_pending leads currently match DEV_FINAL service areas?
SELECT 
    COUNT(*) FILTER (WHERE m.out_team_id IS NOT NULL) as pending_routable_to_dev_final,
    COUNT(*) FILTER (WHERE m.out_team_id IS NULL) as pending_unresolvable_currently
FROM public.crm_leads l
CROSS JOIN LATERAL public.crm_match_team_for_location(l.pincode, l.zone, l.area, l.city, l.state) m
WHERE l.archived_at IS NULL AND l.source NOT IN ('Users','App User') AND l.routing_status = 'reroute_pending';

"""

out, err = run_sql(audit_sql)
print(out)
if err:
    print("ERR:", err)
