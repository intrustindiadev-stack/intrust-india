"""
Regression tests for the AI Grow Wallet system:
- Schema validation
- RPC credit execution
- RPC debit underflow guard
- RPC direct override
- Audit log completeness
"""
import paramiko
import json
import sys

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

def run_sql(c, sql):
    cmd = f"echo \"{sql.replace(chr(34), chr(39))}\" | docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A"
    stdin, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out, err

def run_sql_file(c, sql, label=""):
    remote_path = f"/tmp/test_ai_grow_{label}.sql"
    # Write sql to remote via echo + redirect
    # Use heredoc style
    cmd = f"""docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A << 'EOSQL'
{sql}
EOSQL"""
    stdin, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    return out, err


def main():
    print("Connecting to VPS...")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

    results = []

    # ── 1. Schema Validation ─────────────────────────────────────────────────
    print("\n[1] Schema validation...")
    sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('ai_grow_wallets', 'ai_grow_wallet_transactions') ORDER BY table_name;"
    out, err = run_sql_file(c, sql, "schema")
    tables_found = [t.strip() for t in out.splitlines() if t.strip()]
    expected = ['ai_grow_wallet_transactions', 'ai_grow_wallets']
    if tables_found == expected:
        print(f"  ✅ Tables found: {tables_found}")
        results.append(("Schema: Tables exist", True, ""))
    else:
        print(f"  ❌ Expected {expected}, got {tables_found}")
        results.append(("Schema: Tables exist", False, f"Got: {tables_found}"))

    # Check RPC exists
    sql2 = "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'adjust_merchant_investment_wallet';"
    out2, _ = run_sql_file(c, sql2, "rpc_exists")
    if "adjust_merchant_investment_wallet" in out2:
        print("  ✅ RPC adjust_merchant_investment_wallet exists")
        results.append(("Schema: RPC exists", True, ""))
    else:
        print("  ❌ RPC not found")
        results.append(("Schema: RPC exists", False, out2))

    # ── 2. Get a real merchant ID and real admin ID for testing ───────────────
    print("\n[2] Fetching test merchant and admin...")
    sql3 = "SELECT id FROM public.merchants LIMIT 1;"
    out3, _ = run_sql_file(c, sql3, "get_merchant")
    merchant_id = out3.strip()
    if not merchant_id:
        print("  ⚠️  No merchant found — skipping RPC tests.")
        c.close()
        return
    print(f"  Using merchant: {merchant_id}")

    # Get a real admin user ID from auth.users (any existing user works)
    sql_admin = "SELECT id FROM auth.users LIMIT 1;"
    out_admin, _ = run_sql_file(c, sql_admin, "get_admin")
    admin_id = out_admin.strip()
    if not admin_id:
        print("  ⚠️  No users found — skipping RPC tests.")
        c.close()
        return
    print(f"  Using admin_id: {admin_id}")

    # Ensure no existing test wallet interferes — clean up
    sql_cleanup = f"DELETE FROM public.ai_grow_wallet_transactions WHERE merchant_id = '{merchant_id}'; DELETE FROM public.ai_grow_wallets WHERE merchant_id = '{merchant_id}';"
    run_sql_file(c, sql_cleanup, "cleanup")
    print("  Cleaned up any prior test wallet.")

    # ── 3. Credit Test ────────────────────────────────────────────────────────
    print("\n[3] Credit test (₹10,000)...")
    sql_credit = f"""
SELECT public.adjust_merchant_investment_wallet(
    '{merchant_id}'::uuid,
    'credit',
    10000.00,
    '{admin_id}'::uuid,
    'Test credit for regression testing',
    '{{}}'::jsonb
);
"""
    out_credit, err_credit = run_sql_file(c, sql_credit, "credit")
    if '"success": true' in out_credit or '"success":true' in out_credit or "success" in out_credit:
        print(f"  ✅ Credit RPC succeeded")
        results.append(("RPC: Credit ₹10,000", True, ""))
    else:
        print(f"  ❌ Credit failed: {out_credit} | {err_credit}")
        results.append(("RPC: Credit ₹10,000", False, err_credit))

    # Verify balance
    sql_bal = f"SELECT balance FROM public.ai_grow_wallets WHERE merchant_id = '{merchant_id}';"
    bal_out, _ = run_sql_file(c, sql_bal, "bal_check")
    bal_val = bal_out.strip()
    if bal_val in ("10000.00", "10000"):
        print(f"  ✅ Balance after credit: {bal_val}")
        results.append(("Balance after credit = 10000", True, ""))
    else:
        print(f"  ❌ Unexpected balance: {bal_val}")
        results.append(("Balance after credit = 10000", False, bal_val))

    # Verify audit row
    sql_audit = f"SELECT COUNT(*) FROM public.ai_grow_wallet_transactions WHERE merchant_id = '{merchant_id}' AND transaction_type = 'credit';"
    audit_out, _ = run_sql_file(c, sql_audit, "audit_credit")
    if audit_out.strip() == "1":
        print("  ✅ Audit row for credit exists")
        results.append(("Audit row: credit", True, ""))
    else:
        print(f"  ❌ Audit row count: {audit_out}")
        results.append(("Audit row: credit", False, audit_out))

    # ── 4. Debit Underflow Test ───────────────────────────────────────────────
    print("\n[4] Debit underflow test (₹999,999 from ₹10,000 wallet)...")
    sql_debit_bad = f"""
SELECT public.adjust_merchant_investment_wallet(
    '{merchant_id}'::uuid,
    'debit',
    999999.00,
    '{admin_id}'::uuid,
    'Test debit overflow regression check',
    '{{}}'::jsonb
);
"""
    out_debit_bad, err_debit_bad = run_sql_file(c, sql_debit_bad, "debit_overflow")
    if "Insufficient balance" in err_debit_bad or "Insufficient balance" in out_debit_bad or "22003" in err_debit_bad:
        print("  ✅ Debit underflow correctly rejected")
        results.append(("RPC: Debit underflow rejected", True, ""))
    else:
        print(f"  ❌ Should have failed but got: {out_debit_bad} | {err_debit_bad}")
        results.append(("RPC: Debit underflow rejected", False, f"out={out_debit_bad} err={err_debit_bad}"))

    # Verify balance unchanged
    bal_out2, _ = run_sql_file(c, sql_bal, "bal_after_fail")
    if bal_out2.strip() in ("10000.00", "10000"):
        print(f"  ✅ Balance unchanged at: {bal_out2.strip()}")
        results.append(("Balance unchanged after failed debit", True, ""))
    else:
        print(f"  ❌ Balance changed: {bal_out2}")
        results.append(("Balance unchanged after failed debit", False, bal_out2))

    # ── 5. Direct Override Test ───────────────────────────────────────────────
    print("\n[5] Direct override test (set to ₹25,000)...")
    sql_override = f"""
SELECT public.adjust_merchant_investment_wallet(
    '{merchant_id}'::uuid,
    'admin_adjustment',
    25000.00,
    '{admin_id}'::uuid,
    'Test direct override to 25000 for regression',
    '{{}}'::jsonb
);
"""
    out_override, err_override = run_sql_file(c, sql_override, "override")
    if "success" in out_override.lower() and "ERROR" not in err_override.upper():
        print("  ✅ Override RPC succeeded")
        results.append(("RPC: Direct override ₹25,000", True, ""))
    else:
        print(f"  ❌ Override failed: {out_override} | {err_override}")
        results.append(("RPC: Direct override ₹25,000", False, err_override))

    # Verify balance = 25000
    bal_out3, _ = run_sql_file(c, sql_bal, "bal_override")
    if bal_out3.strip() in ("25000.00", "25000"):
        print(f"  ✅ Balance after override: {bal_out3.strip()}")
        results.append(("Balance after override = 25000", True, ""))
    else:
        print(f"  ❌ Unexpected balance: {bal_out3}")
        results.append(("Balance after override = 25000", False, bal_out3))

    # ── 6. Audit Trail Completeness ───────────────────────────────────────────
    print("\n[6] Audit trail completeness check...")
    sql_full_audit = f"""
SELECT
    transaction_type,
    amount,
    previous_balance,
    new_balance,
    reason,
    admin_id
FROM public.ai_grow_wallet_transactions
WHERE merchant_id = '{merchant_id}'
ORDER BY created_at ASC;
"""
    audit_full_out, _ = run_sql_file(c, sql_full_audit, "full_audit")
    rows = [r.strip() for r in audit_full_out.splitlines() if r.strip()]
    print(f"  Found {len(rows)} audit row(s):")
    for row in rows:
        print(f"    {row}")

    if len(rows) >= 2:  # credit + admin_adjustment (debit failed, so no row)
        print("  ✅ Audit trail has expected entries")
        results.append(("Audit trail: completeness", True, ""))
    else:
        print("  ❌ Expected >= 2 audit rows")
        results.append(("Audit trail: completeness", False, f"Got {len(rows)} rows"))

    # ── 7. FOR UPDATE lock verification (check SQL definition) ───────────────
    print("\n[7] FOR UPDATE lock verification...")
    sql_lock = "SELECT prosrc FROM pg_proc WHERE proname = 'adjust_merchant_investment_wallet';"
    lock_out, _ = run_sql_file(c, sql_lock, "lock_check")
    if "FOR UPDATE" in lock_out:
        print("  ✅ FOR UPDATE row lock confirmed in RPC definition")
        results.append(("RPC: FOR UPDATE lock present", True, ""))
    else:
        print("  ❌ FOR UPDATE not found in RPC source")
        results.append(("RPC: FOR UPDATE lock present", False, ""))

    # ── Cleanup ───────────────────────────────────────────────────────────────
    print("\n[Cleanup] Removing test data...")
    run_sql_file(c, sql_cleanup, "final_cleanup")
    print("  Test data cleaned up.")

    c.close()

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("REGRESSION TEST SUMMARY")
    print("="*60)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)
    for label, ok, detail in results:
        icon = "✅" if ok else "❌"
        print(f"  {icon} {label}" + (f" → {detail}" if detail else ""))
    print(f"\n{passed}/{passed+failed} tests passed.")

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
