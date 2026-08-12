"""
Leave System Comprehensive Audit Script
Queries the VPS Supabase database for leave-related data.
"""
import paramiko

host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"

def run_query(query, label=""):
    # Escape the query for shell
    escaped = query.replace('"', '\\"').replace('\n', ' ').replace("'", "'\\''")
    docker_cmd = f"docker exec supabase-db psql -U postgres -d postgres -t -c '{escaped}'"
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=host, username=user, password=password)
        stdin, stdout, stderr = client.exec_command(docker_cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if label:
            print(f"\n{'='*60}")
            print(f"  {label}")
            print(f"{'='*60}")
        if out.strip():
            print(out)
        if err and 'NOTICE' not in err:
            print("ERR:", err)
    finally:
        client.close()

queries = [
    ("""SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('leave_requests','employee_leave_balances','leave_policies','leave_policy_years','leave_request_actions','leave_balance_adjustments','holidays','organization_policy') ORDER BY table_name""",
     "1. Leave-Related Tables"),

    ("""SELECT policy_year, name, status, effective_from, effective_to FROM public.leave_policy_years ORDER BY policy_year DESC LIMIT 10""",
     "2. Leave Policy Years"),

    ("""SELECT lp.leave_type_key, lp.display_name, lp.annual_entitlement, lp.is_paid, lp.requires_balance, lp.allow_negative_balance, lp.min_notice_days, lp.sort_order, lpy.policy_year FROM public.leave_policies lp JOIN public.leave_policy_years lpy ON lp.policy_year_id = lpy.id WHERE lpy.status = 'published' ORDER BY lpy.policy_year DESC, lp.sort_order ASC""",
     "3. Published Leave Policies"),

    ("""SELECT elb.leave_type, COUNT(*) as employees, AVG(elb.entitled_days)::numeric(5,2) as avg_entitled, AVG(elb.used_days)::numeric(5,2) as avg_used, AVG(elb.reserved_days)::numeric(5,2) as avg_reserved FROM public.employee_leave_balances elb WHERE elb.policy_year = 2026 GROUP BY elb.leave_type ORDER BY elb.leave_type""",
     "4. Leave Balance Summary (2026)"),

    ("""SELECT status, COUNT(*) as count, MIN(from_date) as earliest, MAX(from_date) as latest FROM public.leave_requests WHERE policy_year = 2026 GROUP BY status ORDER BY status""",
     "5. Leave Request Status Breakdown (2026)"),

    ("""SELECT id, status, employee_id, leave_type, from_date, to_date FROM public.leave_requests WHERE status NOT IN ('pending_hr_review','pending_admin_confirmation','approved','rejected_by_hr','rejected_by_admin','cancelled') LIMIT 20""",
     "6. Non-Canonical Status Requests (should be 0)"),

    ("""SELECT elb.employee_id, elb.leave_type, elb.reserved_days as balance_reserved, COALESCE(SUM(lr.chargeable_days), 0) as actual_pending_days, (elb.reserved_days - COALESCE(SUM(lr.chargeable_days), 0)) as discrepancy FROM public.employee_leave_balances elb LEFT JOIN public.leave_requests lr ON lr.employee_id = elb.employee_id AND lr.policy_year = elb.policy_year AND lr.leave_type = elb.leave_type AND lr.status IN ('pending_hr_review','pending_admin_confirmation') WHERE elb.policy_year = 2026 AND elb.reserved_days > 0 GROUP BY elb.employee_id, elb.leave_type, elb.reserved_days HAVING ABS(elb.reserved_days - COALESCE(SUM(lr.chargeable_days), 0)) > 0.01 LIMIT 20""",
     "7. Reserved Days Discrepancies (should be 0)"),

    ("""SELECT elb.employee_id, elb.leave_type, elb.used_days as balance_used, COALESCE(SUM(lr.chargeable_days), 0) as actual_approved_days FROM public.employee_leave_balances elb LEFT JOIN public.leave_requests lr ON lr.employee_id = elb.employee_id AND lr.policy_year = elb.policy_year AND lr.leave_type = elb.leave_type AND lr.status = 'approved' WHERE elb.policy_year = 2026 AND elb.used_days > 0 GROUP BY elb.employee_id, elb.leave_type, elb.used_days HAVING ABS(elb.used_days - COALESCE(SUM(lr.chargeable_days), 0)) > 0.01 LIMIT 20""",
     "8. Used Days Discrepancies (should be 0)"),

    ("""SELECT a.leave_type, a.from_date as a_from, a.to_date as a_to, b.from_date as b_from, b.to_date as b_to, a.status as a_status, b.status as b_status FROM public.leave_requests a JOIN public.leave_requests b ON a.employee_id = b.employee_id AND a.id < b.id WHERE a.status IN ('pending_hr_review','pending_admin_confirmation','approved') AND b.status IN ('pending_hr_review','pending_admin_confirmation','approved') AND (a.from_date <= b.to_date AND a.to_date >= b.from_date) LIMIT 10""",
     "9. Overlapping Active Requests (should be 0)"),

    ("""SELECT holiday_date, name, scope, is_optional FROM public.holidays WHERE EXTRACT(YEAR FROM holiday_date) = 2026 ORDER BY holiday_date""",
     "10. 2026 Holidays"),

    ("""SELECT timezone, standard_start_time, standard_end_time, weekend_days, grace_minutes FROM public.organization_policy LIMIT 1""",
     "11. Organization Policy (Weekend Days = [0,6] means Sun+Sat)"),

    ("""SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE tablename IN ('leave_requests','employee_leave_balances','leave_policies','leave_policy_years','leave_request_actions','leave_balance_adjustments') ORDER BY tablename, policyname""",
     "12. RLS Policies on Leave Tables"),

    ("""SELECT routine_name, security_type FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name ILIKE '%leave%' ORDER BY routine_name""",
     "13. Leave-Related RPC Functions"),

    ("""SELECT public.calculate_leave_days_breakdown('2026-08-10', '2026-08-14', NULL)""",
     "14. Breakdown Mon-Fri Aug10-14 (5 chargeable expected)"),

    ("""SELECT public.calculate_leave_days_breakdown('2026-08-13', '2026-08-17', NULL)""",
     "15. Breakdown Aug13-17 (Thu-Mon, Independence Day Aug15 should be holiday)"),

    ("""SELECT public.calculate_leave_days_breakdown('2026-12-30', '2027-01-02', NULL)""",
     "16. Cross-year Dec30-Jan2"),

    ("""SELECT routine_name, STRING_AGG(pg_get_function_identity_arguments(p.oid)::text, ' | ') as signatures FROM information_schema.routines r JOIN pg_proc p ON p.proname = r.routine_name WHERE r.routine_schema = 'public' AND r.routine_name IN ('submit_leave_request','cancel_leave_request','hr_review_leave_request','admin_review_leave_request') GROUP BY routine_name""",
     "17. RPC Function Signatures (check for OLD overloads)"),

    ("""SELECT COUNT(*) as emp_without_balances FROM public.user_profiles up WHERE up.role IN ('employee','hr_manager','relationship_exec','relationship_manager','freelancer','video_editor','social_media_manager','seo_specialist','advertiser','support_agent') AND NOT EXISTS (SELECT 1 FROM public.employee_leave_balances elb WHERE elb.employee_id = up.id AND elb.policy_year = 2026)""",
     "18. Employees Missing 2026 Leave Balances"),

    ("""SELECT lr.leave_type, lr.from_date, lr.to_date, lr.chargeable_days, lr.status, lr.calendar_breakdown->>'weekend_days' as weekend_days, lr.calendar_breakdown->>'holiday_days' as holiday_days FROM public.leave_requests lr ORDER BY lr.created_at DESC LIMIT 10""",
     "19. Recent Leave Requests With Breakdown"),

    ("""SELECT has_table_privilege('authenticated', 'leave_requests', 'INSERT') as can_insert_directly""",
     "20. Authenticated can INSERT leave_requests directly? (should be false for security)"),
]

for q, label in queries:
    run_query(q, label)

print("\n" + "="*60)
print("  Audit Complete")
print("="*60)
