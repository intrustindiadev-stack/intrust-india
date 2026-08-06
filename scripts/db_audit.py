"""
Database Audit Script v2 — Intrust India
Corrected column names based on initial audit findings.
"""
import paramiko
import sys
import io

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

def upload_and_run_sql(c, sftp, sql, label):
    remote_file = "/tmp/audit_query.sql"
    sftp.putfo(io.BytesIO(sql.encode()), remote_file)
    cmd = f"docker exec -i supabase-db psql -U supabase_admin -d postgres < {remote_file}"
    _, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(f"\n{'='*60}")
    print(f"[{label}]")
    print('='*60)
    if out.strip():
        print(out.strip())
    if err.strip():
        print("STDERR:", err.strip())
    return out

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    sftp = c.open_sftp()
    print("Connected. Running corrected audit...\n")

    # Query 1: All tables with row counts
    upload_and_run_sql(c, sftp, r"""
SELECT
  t.table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass)) AS size
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
""", "ALL PUBLIC TABLES")

    # Query 2: CRM leads actual columns
    upload_and_run_sql(c, sftp, r"""
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'crm_leads'
ORDER BY ordinal_position;
""", "CRM_LEADS ACTUAL COLUMNS")

    # Query 3: employees actual columns
    upload_and_run_sql(c, sftp, r"""
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employees'
ORDER BY ordinal_position;
""", "EMPLOYEES ACTUAL COLUMNS")

    # Query 4: user_profiles all columns
    upload_and_run_sql(c, sftp, r"""
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;
""", "USER_PROFILES ALL COLUMNS")

    # Query 5: Count everything
    upload_and_run_sql(c, sftp, r"""
SELECT
  (SELECT COUNT(*) FROM public.teams) AS total_teams,
  (SELECT COUNT(*) FROM public.teams WHERE is_active = true) AS active_teams,
  (SELECT COUNT(*) FROM public.team_members) AS total_team_members,
  (SELECT COUNT(*) FROM public.user_profiles WHERE team_id IS NOT NULL) AS users_with_team_id,
  (SELECT COUNT(*) FROM public.user_profiles) AS total_users,
  (SELECT COUNT(*) FROM public.employees) AS total_employees;
""", "KEY COUNTS")

    # Query 6: All users with roles
    upload_and_run_sql(c, sftp, r"""
SELECT role::text, COUNT(*) as count FROM public.user_profiles GROUP BY role ORDER BY role;
""", "USER ROLES BREAKDOWN")

    # Query 7: Teams with lead and member counts
    upload_and_run_sql(c, sftp, r"""
SELECT
  t.id,
  t.name,
  t.region_level,
  t.state,
  t.city,
  t.area,
  t.is_active,
  t.version,
  COALESCE(up.full_name, 'NO LEAD') AS team_lead_name,
  up.role::text AS lead_role,
  COUNT(tm.id) AS member_count
FROM public.teams t
LEFT JOIN public.user_profiles up ON up.id = t.team_lead_id
LEFT JOIN public.team_members tm ON tm.team_id = t.id
GROUP BY t.id, t.name, t.region_level, t.state, t.city, t.area, t.is_active, t.version, up.full_name, up.role
ORDER BY t.region_level, t.name;
""", "TEAMS WITH MEMBERS")

    # Query 8: All team members with full details
    upload_and_run_sql(c, sftp, r"""
SELECT
  tm.team_id,
  t.name AS team_name,
  tm.user_id,
  up.full_name,
  up.role::text,
  up.team_id AS profile_team_id,
  (tm.team_id = up.team_id) AS is_synced,
  tm.joined_at
FROM public.team_members tm
JOIN public.teams t ON t.id = tm.team_id
JOIN public.user_profiles up ON up.id = tm.user_id
ORDER BY t.name, up.full_name;
""", "TEAM MEMBERS DETAIL")

    # Query 9: All relationship_exec and relationship_manager users
    upload_and_run_sql(c, sftp, r"""
SELECT
  id,
  full_name,
  role::text,
  email,
  phone,
  team_id,
  is_active
FROM public.user_profiles
WHERE role::text IN ('relationship_exec','relationship_manager','admin','super_admin','employee','hr_manager')
ORDER BY role, full_name;
""", "ELIGIBLE USERS FOR TEAMS")

    # Query 10: Employees detail
    upload_and_run_sql(c, sftp, r"""
SELECT *
FROM public.employees
LIMIT 10;
""", "EMPLOYEES SAMPLE")

    # Query 11: CRM leads sample (use actual columns)
    upload_and_run_sql(c, sftp, r"""
SELECT *
FROM public.crm_leads
ORDER BY created_at DESC
LIMIT 10;
""", "RECENT CRM LEADS SAMPLE")

    # Query 12: team_service_areas actual columns
    upload_and_run_sql(c, sftp, r"""
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'team_service_areas'
ORDER BY ordinal_position;
""", "TEAM_SERVICE_AREAS COLUMNS")

    # Query 13: All functions related to team/crm/lead
    upload_and_run_sql(c, sftp, r"""
SELECT
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef AS security_definer
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND (p.proname LIKE '%team%' OR p.proname LIKE '%crm%' OR p.proname LIKE '%lead%')
ORDER BY p.proname;
""", "ALL TEAM/CRM/LEAD FUNCTIONS")

    # Query 14: Check sync inconsistencies
    upload_and_run_sql(c, sftp, r"""
SELECT
  tm.user_id,
  tm.team_id AS tm_team_id,
  up.team_id AS profile_team_id,
  up.full_name,
  up.role::text
FROM public.team_members tm
JOIN public.user_profiles up ON up.id = tm.user_id
WHERE tm.team_id IS DISTINCT FROM up.team_id;
""", "TEAM_ID SYNC INCONSISTENCIES")

    # Query 15: users with team_id but no team_members entry
    upload_and_run_sql(c, sftp, r"""
SELECT
  up.id,
  up.full_name,
  up.role::text,
  up.team_id
FROM public.user_profiles up
WHERE up.team_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = up.id AND tm.team_id = up.team_id);
""", "ORPHANED team_id IN user_profiles (no matching team_members)")

    # Query 16: crm_leads territory stats
    upload_and_run_sql(c, sftp, r"""
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE assigned_to IS NOT NULL) AS assigned,
  COUNT(*) FILTER (WHERE assigned_to IS NULL) AS unassigned,
  COUNT(DISTINCT state) AS distinct_states,
  COUNT(DISTINCT city) AS distinct_cities
FROM public.crm_leads;
""", "CRM LEADS STATS")

    # Query 17: Check if crm_remarks table exists
    upload_and_run_sql(c, sftp, r"""
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('crm_remarks', 'crm_lead_remarks', 'lead_remarks', 'crm_activities');
""", "CRM REMARKS TABLE EXISTS?")

    # Query 18: Check hrm_employees table structure
    upload_and_run_sql(c, sftp, r"""
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%employ%';
""", "EMPLOYEE-RELATED TABLES")

    # Query 19: Check all tables with crm
    upload_and_run_sql(c, sftp, r"""
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE '%crm%' OR table_name LIKE '%lead%' OR table_name LIKE '%team%')
ORDER BY table_name;
""", "CRM/LEAD/TEAM RELATED TABLES")

    # Query 20: admin_add_team_member function body - to see if role check is correct
    upload_and_run_sql(c, sftp, r"""
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'admin_add_team_member'
AND pronamespace = 'public'::regnamespace;
""", "admin_add_team_member FUNCTION BODY")

    sftp.close()
    c.close()
    print("\nAudit v2 complete.")

if __name__ == "__main__":
    main()
