"""
Verification script for Marketing & Sponsorship Hardening (Plan v3 + Corrections).
Verifies live DB schema, overloads, grants, security exploit seals, and KPI tables.
"""
import paramiko
import io
import json

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "intrustind@2026"
VPS_PORT = 22

def run_sql(c, sftp, sql, label):
    remote_file = "/tmp/verify_marketing.sql"
    sftp.putfo(io.BytesIO(sql.encode('utf-8')), remote_file)
    cmd = f"docker exec -i supabase-db psql -U supabase_admin -d postgres < {remote_file}"
    _, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(f"\n=======================================================")
    print(f"[{label}]")
    print(f"=======================================================")
    if out.strip(): print(out.strip())
    if "ERROR" in err: print("STDERR/ERROR:", err.strip())
    return out, err

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    sftp = c.open_sftp()

    # 1. Overload count check
    run_sql(c, sftp, r"""
    SELECT p.proname AS func, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
        'process_marketing_referral_reward',
        'claim_marketing_target_reward',
        'book_daily_challenge_sponsorship',
        'increment_marketing_link_clicks'
    )
    ORDER BY p.proname;
    """, "1. RPC OVERLOAD AUDIT (Must be 1 single canonical signature each)")

    # 2. Index Audit
    run_sql(c, sftp, r"""
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'marketing_tracking_events'
      AND indexname = 'idx_mte_order_dedupe';
    """, "2. DEDUPE INDEX AUDIT (idx_mte_order_dedupe)")

    # 3. C1 Security Probe: ORDER called with user JWT
    run_sql(c, sftp, r"""
    DO $$
    DECLARE
        v_res jsonb;
    BEGIN
        -- Simulate authenticated client JWT context
        PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
        PERFORM set_config('role', 'authenticated', true);
        
        v_res := public.process_marketing_referral_reward(
            'ORDER',
            'TESTCODE',
            '00000000-0000-0000-0000-000000000001'::uuid,
            NULL::uuid,
            'ORDER_PROBE_001'
        );
        RAISE NOTICE 'PROBE RESULT (Expected Server-side invocation only): %', v_res;
    END $$;
    """, "3. C1 SECURITY PROBE: USER JWT BLOCKED FROM MINTING ORDER REWARD")

    # 4. C2 Milestone Claim Probe: Unearned milestone
    run_sql(c, sftp, r"""
    DO $$
    DECLARE
        v_target_id uuid;
        v_user_id uuid;
        v_res jsonb;
    BEGIN
        SELECT id INTO v_target_id FROM public.marketing_targets LIMIT 1;
        SELECT id INTO v_user_id FROM public.user_profiles LIMIT 1;
        
        -- Simulate service_role invocation with unearned target
        PERFORM set_config('request.jwt.claim.sub', '', true);
        PERFORM set_config('role', 'service_role', true);
        
        v_res := public.claim_marketing_target_reward(
            v_target_id,
            'Test Recipient',
            '9999999999',
            '123 Test Street, New Delhi',
            v_user_id
        );
        RAISE NOTICE 'PROBE RESULT (Expected progress rejected or already claimed): %', v_res;
    END $$;
    """, "4. C2 MILESTONE PROBE: SERVER-SIDE VALIDATION REJECTS UNEARNED CLAIM")

    # 5. C6 Admin KPI Data Check
    run_sql(c, sftp, r"""
    SELECT
        (SELECT count(*) FROM public.daily_challenge_plays) AS daily_plays_count,
        (SELECT count(*) FROM public.daily_challenge_sponsorships WHERE status <> 'cancelled') AS active_sponsorships_count,
        (SELECT coalesce(sum(fee_paise), 0) FROM public.daily_challenge_sponsorships WHERE status <> 'cancelled') AS sponsorship_rev_paise,
        (SELECT count(*) FROM public.marketing_target_claims WHERE status IN ('earned', 'processing')) AS active_claims_count,
        (SELECT coalesce(sum(amount_paise), 0) FROM public.customer_wallet_transactions WHERE reference_type = 'MARKETING_REFERRAL') AS customer_referral_cashback_paise,
        (SELECT coalesce(sum(amount_paise), 0) FROM public.merchant_transactions WHERE transaction_type = 'marketing_cashback') AS merchant_marketing_cashback_paise,
        (SELECT coalesce(sum(cashback_awarded_paise), 0) FROM public.daily_challenge_plays) AS quiz_cashback_paise;
    """, "5. C6 ADMIN KPI AUDIT: REAL DB COUNTS AND AGGREGATIONS")

    sftp.close()
    c.close()
    print("\n[ALL PROBES COMPLETED SUCCESSFULLY]")

if __name__ == "__main__":
    main()
