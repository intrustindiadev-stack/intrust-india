"""
INTRUST India — Security Audit Script
READ-ONLY: Queries only. No data modification.
"""
import paramiko
import json

HOST = "187.124.98.130"
USER = "intrustindia"
PASSWORD = "Intrustdev@2026"

def run_sql(client, query, label=""):
    safe_q = query.replace('"', '\\"')
    cmd = f'docker exec supabase-db psql -U postgres -d postgres -c "{safe_q}"'
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"\n{'='*60}")
    print(f"QUERY: {label}")
    print('='*60)
    if out:
        print(out)
    if err:
        print("ERR:", err)
    return out

def run_sql_file(client, sql, label=""):
    import tempfile, os
    # Write SQL to temp file on VPS and execute
    escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec supabase-db psql -U postgres -d postgres -c $'{escaped}'"
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"\n{'='*60}")
    print(f"QUERY: {label}")
    print('='*60)
    if out:
        print(out)
    if err:
        print("ERR:", err)
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=HOST, username=USER, password=PASSWORD)

# ── 1. All SECURITY DEFINER functions ────────────────────────────────────────
run_sql(client, """
SELECT n.nspname as schema, p.proname as function_name, r.rolname as owner, p.prosecdef as security_definer,
       pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, p.proname
LIMIT 100;
""", "1. ALL SECURITY DEFINER FUNCTIONS")

# ── 2. Function EXECUTE grants ────────────────────────────────────────────────
run_sql(client, """
SELECT routine_schema, routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE grantee IN ('anon', 'authenticated', 'public', 'service_role')
  AND routine_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY routine_schema, routine_name, grantee
LIMIT 200;
""", "2. FUNCTION EXECUTE GRANTS (anon/authenticated/public)")

# ── 3. All UPDATE RLS policies ────────────────────────────────────────────────
run_sql(client, """
SELECT tablename, policyname, cmd, roles, qual::text, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND cmd IN ('UPDATE','ALL')
ORDER BY tablename, policyname;
""", "3. UPDATE RLS POLICIES")

# ── 4. INSERT RLS policies ────────────────────────────────────────────────────
run_sql(client, """
SELECT tablename, policyname, cmd, roles, qual::text, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND cmd IN ('INSERT','ALL')
ORDER BY tablename, policyname;
""", "4. INSERT RLS POLICIES")

# ── 5. Tables with RLS disabled ──────────────────────────────────────────────
run_sql(client, """
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false
ORDER BY tablename;
""", "5. TABLES WITH RLS DISABLED")

# ── 6. Columns of user_profiles ──────────────────────────────────────────────
run_sql(client, """
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;
""", "6. user_profiles COLUMNS")

# ── 7. Columns of customer_wallets ───────────────────────────────────────────
run_sql(client, """
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customer_wallets'
ORDER BY ordinal_position;
""", "7. customer_wallets COLUMNS")

# ── 8. Wallet-related RLS policies ───────────────────────────────────────────
run_sql(client, """
SELECT tablename, policyname, cmd, roles, qual::text, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename ILIKE '%wallet%'
ORDER BY tablename, cmd, policyname;
""", "8. WALLET RLS POLICIES")

# ── 9. Reward-related RLS policies ───────────────────────────────────────────
run_sql(client, """
SELECT tablename, policyname, cmd, roles, qual::text, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND (tablename ILIKE '%reward%' OR tablename ILIKE '%transaction%')
ORDER BY tablename, cmd, policyname;
""", "9. REWARD / TRANSACTION RLS POLICIES")

# ── 10. KYC-related RLS ──────────────────────────────────────────────────────
run_sql(client, """
SELECT tablename, policyname, cmd, roles, qual::text, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename ILIKE '%kyc%'
ORDER BY tablename, cmd, policyname;
""", "10. KYC RLS POLICIES")

# ── 11. Table grants (not default) ───────────────────────────────────────────
run_sql(client, """
SELECT table_name, grantee, string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;
""", "11. TABLE GRANTS (INSERT/UPDATE/DELETE for anon/authenticated)")

# ── 12. Triggers on user_profiles ────────────────────────────────────────────
run_sql(client, """
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'user_profiles'
ORDER BY trigger_name;
""", "12. TRIGGERS ON user_profiles")

# ── 13. Triggers on customer_wallets ─────────────────────────────────────────
run_sql(client, """
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'customer_wallets'
ORDER BY trigger_name;
""", "13. TRIGGERS ON customer_wallets")

# ── 14. All triggers (summary) ───────────────────────────────────────────────
run_sql(client, """
SELECT event_object_table as table_name, trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name
LIMIT 100;
""", "14. ALL TRIGGERS (summary)")

# ── 15. user_profiles RLS policies ───────────────────────────────────────────
run_sql(client, """
SELECT tablename, policyname, cmd, roles, qual::text, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles'
ORDER BY cmd, policyname;
""", "15. user_profiles RLS POLICIES")

# ── 16. Platform settings / reward config table RLS ──────────────────────────
run_sql(client, """
SELECT tablename, policyname, cmd, roles, qual::text, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND (tablename ILIKE '%setting%' OR tablename ILIKE '%config%' OR tablename ILIKE '%platform%')
ORDER BY tablename, cmd, policyname;
""", "16. PLATFORM SETTINGS RLS POLICIES")

# ── 17. Source code of key wallet/reward functions ───────────────────────────
run_sql(client, """
SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN (
  'atomic_customer_wallet_credit',
  'customer_purchase_from_platform',
  'customer_purchase_from_merchant',
  'customer_bulk_purchase_v2',
  'draft_cart_orders',
  'finalize_gateway_orders',
  'recalculate_user_tier',
  'admin_update_user_role',
  'admin_approve_payout',
  'process_reward',
  'credit_reward_points'
)
AND n.nspname = 'public'
ORDER BY p.proname;
""", "17. KEY FUNCTION DEFINITIONS")

# ── 18. Check for any INSERT into reward/wallet from authenticated context ──
run_sql(client, """
SELECT tablename, policyname, cmd, roles, qual::text, with_check::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('reward_transactions', 'customer_wallets', 'transactions', 'merchant_wallets', 'merchant_transactions')
ORDER BY tablename, cmd, policyname;
""", "18. FINANCIAL TABLE RLS POLICIES")

# ── 19. Check table-level privileges directly ─────────────────────────────────
run_sql(client, """
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('customer_wallets', 'reward_transactions', 'transactions', 'user_profiles', 'platform_settings', 'kyc_submissions')
  AND grantee NOT IN ('postgres', 'supabase_admin', 'authenticator', 'pgsodium_keyholder')
ORDER BY table_name, grantee;
""", "19. CRITICAL TABLE PRIVILEGES")

# ── 20. Search for search_path in security definer functions ─────────────────
run_sql(client, """
SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true
  AND n.nspname = 'public'
  AND pg_get_functiondef(p.oid) NOT LIKE '%search_path%'
ORDER BY p.proname
LIMIT 30;
""", "20. SECURITY DEFINER FUNCTIONS WITHOUT search_path")

client.close()
print("\n\n✅ Security audit complete.")
