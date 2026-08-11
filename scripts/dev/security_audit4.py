"""
Part 4: Get exact definitions of most critical functions
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

run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='admin_update_user_role' AND pronamespace='public'::regnamespace;
""", "admin_update_user_role FULL DEFINITION")

run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='atomic_customer_wallet_credit' AND pronamespace='public'::regnamespace;
""", "atomic_customer_wallet_credit FULL DEFINITION")

run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='admin_suspend_user' AND pronamespace='public'::regnamespace;
""", "admin_suspend_user FULL DEFINITION")

run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='admin_unsuspend_user' AND pronamespace='public'::regnamespace;
""", "admin_unsuspend_user FULL DEFINITION")

run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='convert_points_to_wallet' AND pronamespace='public'::regnamespace;
""", "convert_points_to_wallet FULL DEFINITION")

run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='calculate_and_distribute_rewards' AND pronamespace='public'::regnamespace;
""", "calculate_and_distribute_rewards FULL DEFINITION")

run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='customer_checkout_v4' AND pronamespace='public'::regnamespace;
""", "customer_checkout_v4 FULL DEFINITION")

run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='admin_approve_payout' AND pronamespace='public'::regnamespace;
""", "admin_approve_payout FULL DEFINITION")

run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='admin_reject_payout' AND pronamespace='public'::regnamespace;
""", "admin_reject_payout FULL DEFINITION")

# Check reward_configuration and platform_settings RLS in detail
run_query(client, """
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='reward_configuration';
""", "reward_configuration RLS")

run_query(client, """
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='platform_settings';
""", "platform_settings RLS")

# Check user_profiles UPDATE policies and what cols they allow
run_query(client, """
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='user_profiles';
""", "user_profiles ALL POLICIES")

# Is is_active in the sensitive column guard?
run_query(client, """
SELECT pg_get_functiondef(oid) FROM pg_proc
WHERE proname='user_profiles_block_sensitive_column_updates' AND pronamespace='public'::regnamespace;
""", "user_profiles_block_sensitive_column_updates DEFINITION")

# Shopping order groups UPDATE - who can set payment_status=paid?
run_query(client, """
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='shopping_order_groups' AND cmd IN ('UPDATE', 'ALL');
""", "shopping_order_groups UPDATE POLICIES")

client.close()
print("\n✅ Part 4 complete.")
