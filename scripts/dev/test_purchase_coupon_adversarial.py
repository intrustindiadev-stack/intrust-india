import paramiko
import sys
import json

HOST = '187.124.98.130'
USER = 'intrustindia'
PW = 'Intrustdev@2026'

# User and Coupon UUIDs
CUSTOMER_ID = 'f52e322a-e80f-400e-98cf-d950c63b5515'
OTHER_USER_ID = 'd4b2372d-1466-4913-bc35-942cb4fa9770'

sql_script = f"""
DO $$
DECLARE
    v_coupon_id uuid;
    v_coupon_id_2 uuid;
    v_txn_id uuid;
    v_result jsonb;
    v_pass boolean;
BEGIN
    RAISE NOTICE '--- STARTING ADVERSARIAL TESTS FOR purchase_coupon ---';

    -- Helper to set auth context
    CREATE OR REPLACE FUNCTION set_auth(p_uid text) RETURNS void AS $f$
    BEGIN
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', format('{{"sub":"%s", "role":"authenticated"}}', p_uid), true);
        PERFORM set_config('request.jwt.claim.sub', p_uid, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    END;
    $f$ LANGUAGE plpgsql;
    
    -- Setup: Create two available test coupons
    INSERT INTO public.coupons (brand, title, description, category, face_value_paise, selling_price_paise, valid_until, status)
    VALUES ('TEST', 'Adversarial Test Coupon 1', 'Test', 'shopping', 100000, 100000, now() + interval '1 day', 'available')
    RETURNING id INTO v_coupon_id;

    INSERT INTO public.coupons (brand, title, description, category, face_value_paise, selling_price_paise, valid_until, status)
    VALUES ('TEST', 'Adversarial Test Coupon 2', 'Test', 'shopping', 100000, 100000, now() + interval '1 day', 'available')
    RETURNING id INTO v_coupon_id_2;

    -- Test 1: Fake payment reference
    PERFORM set_auth('{CUSTOMER_ID}');
    BEGIN
        v_result := public.purchase_coupon(v_coupon_id, 'FAKE_PAYMENT_REF_123');
        RAISE NOTICE 'PASS (Vulnerability Confirmed) | 1. Fake payment reference succeeded. Result: %', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'FAIL | 1. Fake payment reference blocked. Error: %', SQLERRM;
    END;

    -- Test 2: Reused payment reference on different coupon
    BEGIN
        v_result := public.purchase_coupon(v_coupon_id_2, 'FAKE_PAYMENT_REF_123');
        RAISE NOTICE 'PASS (Vulnerability Confirmed) | 2. Reused payment reference succeeded. Result: %', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'FAIL | 2. Reused payment reference blocked. Error: %', SQLERRM;
    END;

    -- Test 3: Unauthenticated invocation
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claims', '', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    BEGIN
        v_result := public.purchase_coupon(v_coupon_id, 'ANY_REF');
        RAISE NOTICE 'PASS (Vulnerability Confirmed) | 3. Unauthenticated invocation succeeded.';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'FAIL | 3. Unauthenticated invocation blocked as expected. Error: %', SQLERRM;
    END;

    -- Cleanup
    PERFORM set_config('role', 'postgres', true);
    DELETE FROM public.transactions WHERE payment_reference = 'FAKE_PAYMENT_REF_123';
    DELETE FROM public.coupons WHERE id IN (v_coupon_id, v_coupon_id_2);

    RAISE NOTICE '--- END ADVERSARIAL TESTS ---';
END;
$$;
"""

print("Connecting to VPS...")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PW)

cmd = "docker exec -i supabase-db psql -U postgres -d postgres"
stdin, stdout, stderr = c.exec_command(cmd)
stdin.write(sql_script.encode('utf-8'))
stdin.close()

out = stdout.read().decode('utf-8')
err = stderr.read().decode('utf-8')

for line in err.splitlines():
    if line.startswith("NOTICE:"):
        print(line.replace("NOTICE:  ", ""))

c.close()
