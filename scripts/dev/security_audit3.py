"""
INTRUST India — Security Audit Part 3: 
- Specific dangerous function definitions
- RLS policies in detail
- API route checks
"""
import paramiko

HOST = "187.124.98.130"
USER = "intrustindia"
PASSWORD = "Intrustdev@2026"

def run_query(client, query, label):
    cmd = "docker exec supabase-db psql -U postgres -d postgres --no-align -t -c \"" + query.replace('"', '\\"') + "\""
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"\n{'='*70}")
    print(f">>> {label}")
    print('='*70)
    if out.strip():
        print(out)
    if err.strip():
        print("ERR:", err[:500])

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=HOST, username=USER, password=PASSWORD)

# atomic_customer_wallet_credit - critical function
run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='atomic_customer_wallet_credit' AND pronamespace='public'::regnamespace;
""", "atomic_customer_wallet_credit FULL DEFINITION")

# admin_update_user_role - critical function
run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='admin_update_user_role' AND pronamespace='public'::regnamespace;
""", "admin_update_user_role FULL DEFINITION")

# admin_suspend_user + admin_unsuspend_user
run_query(client, """
SELECT proname, pg_get_functiondef(oid) FROM pg_proc
WHERE proname IN ('admin_suspend_user', 'admin_unsuspend_user') AND pronamespace='public'::regnamespace;
""", "admin_suspend_user + admin_unsuspend_user DEFINITIONS")

# calculate_and_distribute_rewards - check caller validation
run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='calculate_and_distribute_rewards' AND pronamespace='public'::regnamespace;
""", "calculate_and_distribute_rewards DEFINITION")

# customer_purchase_from_platform
run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='customer_purchase_from_platform' AND pronamespace='public'::regnamespace;
""", "customer_purchase_from_platform FULL DEFINITION")

# convert_points_to_wallet
run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='convert_points_to_wallet' AND pronamespace='public'::regnamespace;
""", "convert_points_to_wallet FULL DEFINITION")

# admin_approve_payout + admin_reject_payout
run_query(client, """
SELECT proname, pg_get_functiondef(oid) FROM pg_proc
WHERE proname IN ('admin_approve_payout', 'admin_reject_payout') AND pronamespace='public'::regnamespace;
""", "admin_approve_payout + admin_reject_payout DEFINITIONS")

# detailed reward_configuration RLS
run_query(client, """
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='reward_configuration'
ORDER BY cmd, policyname;
""", "reward_configuration RLS POLICIES")

# platform_settings RLS
run_query(client, """
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='platform_settings'
ORDER BY cmd, policyname;
""", "platform_settings RLS POLICIES")

# user_profiles detailed update policy
run_query(client, """
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='user_profiles' AND cmd IN ('UPDATE','ALL')
ORDER BY policyname;
""", "user_profiles UPDATE POLICIES (detailed)")

# kyc_submissions detailed
run_query(client, """
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='kyc_submissions'
ORDER BY cmd, policyname;
""", "kyc_submissions RLS (detailed)")

# reward_points_balance RLS
run_query(client, """
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='reward_points_balance'
ORDER BY cmd, policyname;
""", "reward_points_balance RLS (detailed)")

# crm_leads RLS
run_query(client, """
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='crm_leads'
ORDER BY cmd, policyname;
""", "crm_leads RLS (detailed)")

# shopping_order_groups UPDATE RLS
run_query(client, """
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='shopping_order_groups'
ORDER BY cmd, policyname;
""", "shopping_order_groups RLS (detailed)")

# Check reward_daily_caps INSERT/UPDATE policies
run_query(client, """
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='reward_daily_caps'
ORDER BY cmd, policyname;
""", "reward_daily_caps RLS (detailed)")

# Check payout_requests RLS
run_query(client, """
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='payout_requests'
ORDER BY cmd, policyname;
""", "payout_requests RLS (detailed)")

# Check if adjust_employee_leave_balance validates role
run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='adjust_employee_leave_balance' AND pronamespace='public'::regnamespace;
""", "adjust_employee_leave_balance DEFINITION")

# Check finalize_gateway_orders 
run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='finalize_gateway_orders' AND pronamespace='public'::regnamespace;
""", "finalize_gateway_orders DEFINITION")

# draft_cart_orders
run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='draft_cart_orders' AND pronamespace='public'::regnamespace;
""", "draft_cart_orders DEFINITION")

# search_path check on security definer functions (ones without SET search_path)
run_query(client, """
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true
  AND n.nspname = 'public'
  AND NOT (pg_get_functiondef(p.oid) ILIKE '%SET search_path%')
  AND NOT (pg_get_functiondef(p.oid) ILIKE '%search_path = pg_catalog, public%')
ORDER BY p.proname;
""", "SECURITY DEFINER WITHOUT SET search_path")

client.close()
print("\n✅ Part 3 audit complete.")
