import paramiko
import json

HOST = "187.124.98.130"
USER = "intrustindia"
PASSWORD = "Intrustdev@2026"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=HOST, username=USER, password=PASSWORD)

def run(q):
    cmd = f"""docker exec supabase-db psql -U postgres -d postgres -t -A -c "{q.replace('"', chr(92) + '"')}" """
    _, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace')

# 1. Get ALL function defs with grants in one shot
print("=== FINANCIAL FUNCTIONS WITH CURRENT GRANTS ===")
financial_funcs = [
    'customer_purchase_from_merchant',
    'finalize_gateway_orders',
    'perform_wallet_adjustment',
    'calculate_and_distribute_rewards',
    'wallet_activate_gold_subscription',
    'atomic_customer_wallet_credit',
    'merchant_cancel_pending_payout',
    'increment_customer_wallet',
    'customer_checkout_v4',
    'customer_bulk_purchase',
    'customer_bulk_purchase_v2',
    'customer_purchase_from_platform',
    'purchase_platform_products',
    'purchase_platform_products_bulk',
    'draft_cart_orders',
    'settle_store_credit_for_cart',
    'settle_udhari_gateway_payment',
    'settle_udhari_payment',
    'finalize_coupon_purchase',
    'wallet_buy_gift_card',
    'convert_points_to_wallet',
    'admin_approve_payout',
    'admin_reject_payout',
    'merchant_request_payout',
    'distribute_merchant_referral_reward',
    'finalize_wholesale_gateway_purchase',
    'handle_new_user_wallet',
    'handle_new_user',
    'recalculate_user_tier',
    'procure_from_merchant',
]

for name in financial_funcs:
    q = f"SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname=\\'{name}\\' AND pronamespace=\\'public\\'::regnamespace LIMIT 1"
    cmd = f"docker exec supabase-db psql -U postgres -d postgres -t -A -c \"SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='{name}' AND pronamespace='public'::regnamespace LIMIT 1\""
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    print(f"\n--- FUNCTION: {name} ---")
    print(out[:2000])

# 2. Get current grants for all financial functions
print("\n\n=== EXECUTE GRANTS FOR FINANCIAL FUNCTIONS ===")
func_list = "','".join(financial_funcs)
grants_q = f"""SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_schema='public' AND routine_name IN ('{func_list}') ORDER BY routine_name, grantee"""
cmd = f"docker exec supabase-db psql -U postgres -d postgres -t -A --field-separator='|' -c \"{grants_q}\""
_, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
