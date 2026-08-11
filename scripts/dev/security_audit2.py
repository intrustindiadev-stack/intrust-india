"""
INTRUST India — Targeted Security Audit — Part 2
READ-ONLY queries, structured output
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

# 1. All SECURITY DEFINER function names (compact)
run_query(client, """
SELECT n.nspname||'.'||p.proname||'('||COALESCE(pg_get_function_identity_arguments(p.oid),'')||')' as func
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
ORDER BY n.nspname, p.proname;
""", "ALL SECURITY DEFINER FUNCTIONS")

# 2. EXECUTE grants on public schema functions
run_query(client, """
SELECT routine_name, grantee
FROM information_schema.routine_privileges
WHERE grantee IN ('anon','authenticated','PUBLIC')
  AND routine_schema = 'public'
ORDER BY routine_name, grantee;
""", "FUNCTION EXECUTE GRANTS (anon/authenticated)")

# 3. UPDATE policies across all tables
run_query(client, """
SELECT tablename, policyname, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND cmd IN ('UPDATE','ALL')
ORDER BY tablename, policyname;
""", "UPDATE RLS POLICIES")

# 4. INSERT policies
run_query(client, """
SELECT tablename, policyname, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND cmd IN ('INSERT','ALL')
ORDER BY tablename, policyname;
""", "INSERT RLS POLICIES")

# 5. Tables without RLS
run_query(client, """
SELECT tablename
FROM pg_tables
WHERE schemaname='public' AND rowsecurity=false
ORDER BY tablename;
""", "TABLES WITH RLS DISABLED")

# 6. user_profiles columns
run_query(client, """
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='user_profiles'
ORDER BY ordinal_position;
""", "user_profiles COLUMNS")

# 7. RLS policies on critical financial tables
run_query(client, """
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('customer_wallets','reward_transactions','transactions','merchant_wallets','merchant_transactions','platform_settings','kyc_submissions')
ORDER BY tablename, cmd, policyname;
""", "FINANCIAL/SENSITIVE TABLE RLS POLICIES")

# 8. user_profiles RLS policies
run_query(client, """
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='user_profiles'
ORDER BY cmd, policyname;
""", "user_profiles RLS POLICIES")

# 9. Table-level grants (INSERT/UPDATE/DELETE for anon/authenticated)
run_query(client, """
SELECT table_name, grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND grantee IN ('anon','authenticated')
  AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;
""", "TABLE GRANTS: INSERT/UPDATE/DELETE for anon/authenticated")

# 10. Triggers on key tables
run_query(client, """
SELECT event_object_table, trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema='public'
  AND event_object_table IN ('user_profiles','customer_wallets','reward_transactions','transactions','kyc_submissions','platform_settings')
ORDER BY event_object_table, trigger_name;
""", "TRIGGERS ON SENSITIVE TABLES")

# 11. atomic_customer_wallet_credit function definition
run_query(client, """
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname='atomic_customer_wallet_credit' AND pronamespace='public'::regnamespace;
""", "atomic_customer_wallet_credit DEFINITION")

# 12. customer_purchase_from_platform definition
run_query(client, """
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname='customer_purchase_from_platform' AND pronamespace='public'::regnamespace;
""", "customer_purchase_from_platform DEFINITION")

# 13. customer_purchase_from_merchant definition
run_query(client, """
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname='customer_purchase_from_merchant' AND pronamespace='public'::regnamespace;
""", "customer_purchase_from_merchant DEFINITION")

# 14. admin_update_user_role or equivalent
run_query(client, """
SELECT p.proname, pg_get_functiondef(p.oid)
FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace
  AND (p.proname ILIKE '%role%' OR p.proname ILIKE '%admin%update%' OR p.proname ILIKE '%suspend%')
ORDER BY p.proname;
""", "ROLE/ADMIN/SUSPEND FUNCTION DEFINITIONS")

# 15. finalize_gateway_orders or equivalent
run_query(client, """
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname IN ('finalize_gateway_orders','draft_cart_orders','customer_bulk_purchase_v2')
  AND pronamespace='public'::regnamespace;
""", "GATEWAY/CART/PURCHASE FUNCTION DEFINITIONS")

# 16. Check if user_profiles_block_sensitive_column_updates trigger exists
run_query(client, """
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_table='user_profiles' AND event_object_schema='public';
""", "user_profiles TRIGGER STATUS")

# 17. reward configuration table contents  
run_query(client, """
SELECT key, value, updated_at
FROM public.platform_settings
WHERE key ILIKE '%reward%' OR key ILIKE '%signup%' OR key ILIKE '%tier%'
ORDER BY key
LIMIT 30;
""", "REWARD CONFIGURATION (platform_settings)")

# 18. Check process_reward / credit_reward_points function
run_query(client, """
SELECT p.proname, prosecdef, pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace
  AND (p.proname ILIKE '%reward%' OR p.proname ILIKE '%credit%')
ORDER BY p.proname;
""", "REWARD-RELATED FUNCTION LIST")

# 19. Check who owns customer_wallets and what the RLS is
run_query(client, """
SELECT tableowner FROM pg_tables WHERE tablename='customer_wallets' AND schemaname='public';
""", "customer_wallets OWNER")

# 20. All policies (summarised)
run_query(client, """
SELECT tablename, count(*) as num_policies,
       string_agg(DISTINCT cmd, ', ' ORDER BY cmd) as cmds
FROM pg_policies
WHERE schemaname='public'
GROUP BY tablename
ORDER BY tablename;
""", "ALL TABLES WITH RLS POLICIES (summary)")

client.close()
print("\n✅ Part 2 audit complete.")
