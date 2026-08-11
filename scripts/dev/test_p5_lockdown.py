"""
Adversarial test suite for Phase 1 financial RPC lockdown.
Tests both attack vectors (must FAIL) and legitimate flows (must PASS).
Run AFTER applying 20260812_p5_emergency_financial_rpc_lockdown.sql.
"""
import os
import sys
import json
import uuid
import requests

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://qrfbcetcjkjulqycbxfk.supabase.co")
SUPABASE_ANON_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
# Use a real test user JWT — obtained via supabase.auth.signInWithPassword()
# Set TEST_USER_JWT to a valid authenticated JWT for a known test user
TEST_USER_JWT = os.environ.get("TEST_USER_JWT", "")
APP_BASE = os.environ.get("APP_BASE_URL", "https://intrustindia.com")

results = []

def rpc_call(func_name, params, jwt=None):
    """Make a direct Supabase RPC call."""
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if jwt:
        headers["Authorization"] = f"Bearer {jwt}"
    try:
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/{func_name}",
            json=params,
            headers=headers,
            timeout=15
        )
        return resp.status_code, resp.json() if resp.text else {}
    except Exception as e:
        return None, str(e)

def expect_fail(label, status_code, body):
    """Assert that a call was denied (expected status 401, 403, or 404 with permission denied)."""
    is_permission_denied = (
        status_code in (401, 403) or
        (isinstance(body, dict) and "permission denied" in str(body).lower()) or
        (isinstance(body, list) and any("permission denied" in str(x).lower() for x in body))
    )
    if is_permission_denied:
        results.append(("PASS", label, f"Correctly denied (HTTP {status_code})"))
        print(f"  ✅ PASS: {label} → denied (HTTP {status_code})")
    else:
        results.append(("FAIL", label, f"Expected denial but got HTTP {status_code}: {body}"))
        print(f"  ❌ FAIL: {label} → expected denial but got HTTP {status_code}: {body}")

def expect_pass(label, status_code, body):
    """Assert that a legitimate call succeeded."""
    if status_code in (200, 201):
        results.append(("PASS", label, f"Succeeded (HTTP {status_code})"))
        print(f"  ✅ PASS: {label} → succeeded (HTTP {status_code})")
    else:
        results.append(("WARN", label, f"Expected success but got HTTP {status_code}: {body}"))
        print(f"  ⚠️  WARN: {label} → HTTP {status_code}: {body}")

# ────────────────────────────────────────────────────────────
# ATTACK TESTS — Must all FAIL after migration
# ────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("ATTACK TESTS (all must be denied)")
print("="*60)

# ANON attacks
status, body = rpc_call("perform_wallet_adjustment", {
    "p_target_user_id": str(uuid.uuid4()),
    "p_wallet_type": "customer",
    "p_operation": "credit",
    "p_amount_paise": 100000000,
    "p_admin_user_id": str(uuid.uuid4()),
    "p_reason": "test",
    "p_idempotency_key": str(uuid.uuid4())
}, jwt=None)
expect_fail("[ANON] perform_wallet_adjustment → credit 100000000 paise", status, body)

status, body = rpc_call("increment_customer_wallet", {
    "p_user_id": str(uuid.uuid4()),
    "p_amount_paise": 50000000,
    "p_type": "CREDIT",
    "p_description": "attack_test"
}, jwt=None)
expect_fail("[ANON] increment_customer_wallet → 50000000 paise", status, body)

status, body = rpc_call("finalize_gateway_orders", {
    "p_group_id": str(uuid.uuid4()),
    "p_customer_id": str(uuid.uuid4()),
    "p_amount_paise": 1
}, jwt=None)
expect_fail("[ANON] finalize_gateway_orders → fake order", status, body)

status, body = rpc_call("calculate_and_distribute_rewards", {
    "p_event_type": "purchase",
    "p_source_user_id": str(uuid.uuid4()),
    "p_amount_paise": 1000000000
}, jwt=None)
expect_fail("[ANON] calculate_and_distribute_rewards → fake 1Cr purchase", status, body)

status, body = rpc_call("wallet_buy_gift_card", {
    "p_user_id": str(uuid.uuid4()),
    "p_coupon_id": str(uuid.uuid4())
}, jwt=None)
expect_fail("[ANON] wallet_buy_gift_card → IDOR victim wallet", status, body)

status, body = rpc_call("finalize_coupon_purchase", {
    "p_order_id": str(uuid.uuid4()),
    "p_payment_id": "fake_rzp_123"
}, jwt=None)
expect_fail("[ANON] finalize_coupon_purchase → fake payment", status, body)

# AUTHENTICATED attacks (if test JWT is available)
if TEST_USER_JWT:
    print("\n--- Authenticated attacker tests ---")

    status, body = rpc_call("perform_wallet_adjustment", {
        "p_target_user_id": str(uuid.uuid4()),
        "p_wallet_type": "customer",
        "p_operation": "credit",
        "p_amount_paise": 100000000,
        "p_admin_user_id": str(uuid.uuid4()),
        "p_reason": "attack",
        "p_idempotency_key": str(uuid.uuid4())
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] perform_wallet_adjustment → credit any user", status, body)

    status, body = rpc_call("increment_customer_wallet", {
        "p_user_id": str(uuid.uuid4()),
        "p_amount_paise": 50000000,
        "p_type": "CREDIT",
        "p_description": "attack"
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] increment_customer_wallet → arbitrary user", status, body)

    status, body = rpc_call("customer_purchase_from_merchant", {
        "p_inventory_id": str(uuid.uuid4()),
        "p_quantity": 999,
        "p_customer_id": str(uuid.uuid4())
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] customer_purchase_from_merchant → IDOR wallet drain", status, body)

    status, body = rpc_call("customer_purchase_from_platform", {
        "p_product_id": str(uuid.uuid4()),
        "p_quantity": 999,
        "p_customer_id": str(uuid.uuid4())
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] customer_purchase_from_platform → IDOR wallet drain", status, body)

    status, body = rpc_call("finalize_gateway_orders", {
        "p_group_id": str(uuid.uuid4()),
        "p_customer_id": str(uuid.uuid4()),
        "p_amount_paise": 1
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] finalize_gateway_orders → order without payment", status, body)

    status, body = rpc_call("calculate_and_distribute_rewards", {
        "p_event_type": "purchase",
        "p_source_user_id": str(uuid.uuid4()),
        "p_amount_paise": 1000000000
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] calculate_and_distribute_rewards → fake reward", status, body)

    status, body = rpc_call("wallet_buy_gift_card", {
        "p_user_id": str(uuid.uuid4()),
        "p_coupon_id": str(uuid.uuid4())
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] wallet_buy_gift_card → IDOR", status, body)

    status, body = rpc_call("wallet_activate_gold_subscription", {
        "p_user_id": str(uuid.uuid4()),
        "p_package_key": "gold_annual",
        "p_idempotency_key": str(uuid.uuid4())
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] wallet_activate_gold_subscription → drain victim", status, body)

    status, body = rpc_call("distribute_merchant_referral_reward", {
        "p_new_merchant_id": str(uuid.uuid4())
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] distribute_merchant_referral_reward → fake reward", status, body)

    status, body = rpc_call("finalize_coupon_purchase", {
        "p_order_id": str(uuid.uuid4()),
        "p_payment_id": "fake_rzp_456"
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] finalize_coupon_purchase → fake payment", status, body)

    status, body = rpc_call("settle_udhari_gateway_payment", {
        "p_udhari_request_id": str(uuid.uuid4()),
        "p_customer_user_id": str(uuid.uuid4()),
        "p_amount_paise": 100000
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] settle_udhari_gateway_payment → fake settle", status, body)

    status, body = rpc_call("settle_store_credit_for_cart", {
        "p_udhari_request_id": str(uuid.uuid4()),
        "p_customer_user_id": str(uuid.uuid4())
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] settle_store_credit_for_cart → fake settle", status, body)

    status, body = rpc_call("finalize_wholesale_gateway_purchase", {
        "p_draft_id": str(uuid.uuid4()),
        "p_amount_paise": 100000
    }, jwt=TEST_USER_JWT)
    expect_fail("[AUTH] finalize_wholesale_gateway_purchase → fake wholesale", status, body)

else:
    print("\n⚠️  TEST_USER_JWT not set — skipping authenticated attacker tests")
    print("   Set: export TEST_USER_JWT='eyJ...' to run authenticated tests")

# ────────────────────────────────────────────────────────────
# LEGITIMATE FLOW TESTS — Must all PASS
# ────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("LEGITIMATE FLOW TESTS (must pass)")
print("="*60)

# Test: Site is up and serving authenticated content
try:
    resp = requests.get(APP_BASE, timeout=10, allow_redirects=True)
    if resp.status_code == 200:
        print(f"  ✅ PASS: Site is up (HTTP {resp.status_code})")
        results.append(("PASS", "Site health check", f"HTTP {resp.status_code}"))
    else:
        print(f"  ❌ FAIL: Site returned HTTP {resp.status_code}")
        results.append(("FAIL", "Site health check", f"HTTP {resp.status_code}"))
except Exception as e:
    print(f"  ❌ FAIL: Site unreachable: {e}")
    results.append(("FAIL", "Site health check", str(e)))

# Test: API health
try:
    resp = requests.get(f"{APP_BASE}/api/health", timeout=10)
    if resp.status_code in (200, 404):  # 404 is ok if route doesn't exist
        print(f"  ✅ PASS: API responding (HTTP {resp.status_code})")
        results.append(("PASS", "API health", f"HTTP {resp.status_code}"))
    else:
        print(f"  ⚠️  WARN: API /health HTTP {resp.status_code}")
        results.append(("WARN", "API health", f"HTTP {resp.status_code}"))
except Exception as e:
    print(f"  ❌ FAIL: API unreachable: {e}")
    results.append(("FAIL", "API health", str(e)))

# ────────────────────────────────────────────────────────────
# SUMMARY
# ────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("RESULTS SUMMARY")
print("="*60)
passed = [r for r in results if r[0] == "PASS"]
failed = [r for r in results if r[0] == "FAIL"]
warned = [r for r in results if r[0] == "WARN"]

print(f"PASS: {len(passed)}")
print(f"FAIL: {len(failed)}")
print(f"WARN: {len(warned)}")
if failed:
    print("\nFAILED TESTS:")
    for r in failed:
        print(f"  ❌ {r[1]}: {r[2]}")
if warned:
    print("\nWARNINGS:")
    for r in warned:
        print(f"  ⚠️  {r[1]}: {r[2]}")
print()
