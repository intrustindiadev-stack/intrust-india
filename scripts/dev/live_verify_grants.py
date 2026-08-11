"""
Re-verify every emergency financial function against LIVE production DB.
Pulls: function signature, prosecdef, owner, current grants, full body.
"""
import paramiko
import json

HOST = "187.124.98.130"
USER = "intrustindia"
PASSWORD = "Intrustdev@2026"

EMERGENCY_FUNCTIONS = [
    "perform_wallet_adjustment",
    "increment_customer_wallet",
    "customer_purchase_from_merchant",
    "customer_purchase_from_platform",
    "customer_bulk_purchase",
    "customer_bulk_purchase_v2",
    "finalize_gateway_orders",
    "wallet_buy_gift_card",
    "wallet_activate_gold_subscription",
    "calculate_and_distribute_rewards",
    "finalize_coupon_purchase",
    # Also verify the ones we say are "already secured"
    "atomic_customer_wallet_credit",
    # And the borderline ones
    "draft_cart_orders",
    "merchant_cancel_pending_payout",
    "merchant_request_payout",
    "distribute_merchant_referral_reward",
    "convert_points_to_wallet",
    "settle_udhari_gateway_payment",
    "settle_udhari_payment",
    "settle_store_credit_for_cart",
    "finalize_wholesale_gateway_purchase",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=HOST, username=USER, password=PASSWORD)

def psql(query):
    cmd = f"docker exec supabase-db psql -U postgres -d postgres -t -A --field-separator='|' -c \"{query.replace(chr(34), chr(92)+chr(34))}\""
    _, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode("utf-8", errors="replace").strip()

print("=" * 80)
print("LIVE PRODUCTION GRANT VERIFICATION")
print("=" * 80)

# 1. Get grants for all functions at once
func_list = "','".join(EMERGENCY_FUNCTIONS)
grants_raw = psql(f"""
SELECT routine_name, grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_schema='public' 
AND routine_name IN ('{func_list}')
ORDER BY routine_name, grantee
""")
print("\n--- CURRENT GRANTS (routine_name|grantee|privilege_type) ---")
print(grants_raw)

# 2. Get function metadata (security definer, owner, arg types)
meta_raw = psql(f"""
SELECT 
    p.proname,
    p.prosecdef,
    r.rolname as owner,
    pg_get_function_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public'
AND p.proname IN ('{func_list}')
ORDER BY p.proname
""")
print("\n--- FUNCTION METADATA (name|security_definer|owner|args) ---")
print(meta_raw)

# 3. Check if auth.uid() used and tables written
print("\n--- AUTH.UID() USAGE & TABLE WRITES ---")
for fname in EMERGENCY_FUNCTIONS:
    body = psql(f"""
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname='{fname}' 
AND pronamespace='public'::regnamespace 
LIMIT 1
""")
    has_auth_uid = "auth.uid()" in body
    has_p_user = any(p in body for p in ["p_user_id", "p_customer_id", "p_admin_user_id", "p_target_user_id"])
    # Find UPDATE/INSERT/DELETE targets
    import re
    tables_written = re.findall(r'(?:UPDATE|INSERT INTO|DELETE FROM)\s+(?:public\.)?(\w+)', body, re.IGNORECASE)
    tables_written = list(set(tables_written))
    print(f"\n  {fname}:")
    print(f"    auth.uid() used: {has_auth_uid}")
    print(f"    caller-supplied ID: {has_p_user}")
    print(f"    tables written: {tables_written}")

client.close()
print("\n=== DONE ===")
