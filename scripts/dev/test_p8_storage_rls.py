import paramiko
import sys
import json

HOST = '187.124.98.130'
USER = 'intrustindia'
PW = 'Intrustdev@2026'

CUSTOMER_ID = 'f52e322a-e80f-400e-98cf-d950c63b5515'
MERCHANT_ID = '014b8897-8639-44d2-9323-275822bf3dff'
ADMIN_ID = '6e81e8f5-337d-4d92-ab4f-e633f890b8de'
OTHER_USER_ID = 'd4b2372d-1466-4913-bc35-942cb4fa9770'

sql_script = f"""
DO $$
DECLARE
    v_test_name text;
    v_success boolean;
    v_message text;
BEGIN
    RAISE NOTICE '--- STARTING STORAGE RLS TESTS ---';
    
    -- Function to set auth context
    CREATE OR REPLACE FUNCTION set_auth(p_role text, p_uid text) RETURNS void AS $f$
    BEGIN
        PERFORM set_config('role', p_role, true);
        PERFORM set_config('request.jwt.claims', format('{{"sub":"%s", "role":"%s"}}', p_uid, p_role), true);
        PERFORM set_config('request.jwt.claim.sub', p_uid, true);
        PERFORM set_config('request.jwt.claim.role', p_role, true);
    END;
    $f$ LANGUAGE plpgsql;

    -- Helper to execute dynamic SQL and catch errors
    CREATE OR REPLACE FUNCTION try_insert(p_bucket text, p_name text) RETURNS text AS $f$
    BEGIN
        INSERT INTO storage.objects (bucket_id, name, owner) VALUES (p_bucket, p_name, (current_setting('request.jwt.claims')::json->>'sub')::uuid);
        RETURN 'OK';
    EXCEPTION WHEN OTHERS THEN
        RETURN SQLERRM;
    END;
    $f$ LANGUAGE plpgsql;

    -- Helper for tests
    CREATE OR REPLACE FUNCTION run_test(p_test_name text, p_bucket text, p_name text, p_role text, p_uid text, p_expect_success boolean) RETURNS void AS $f$
    DECLARE
        v_passed boolean;
        v_actual text;
    BEGIN
        PERFORM set_auth(p_role, p_uid);
        v_actual := try_insert(p_bucket, p_name);
        v_passed := ((v_actual = 'OK') = p_expect_success);
        IF v_passed THEN
            RAISE NOTICE 'PASS | %', p_test_name;
        ELSE
            RAISE NOTICE 'FAIL | % | Expected success: %, Got: %', p_test_name, p_expect_success, v_actual;
        END IF;
    END;
    $f$ LANGUAGE plpgsql;

    -- Start testing
    
    -- 1. Test legitimate avatar upload
    PERFORM run_test('1. Legitimate avatar upload', 'avatars', '{CUSTOMER_ID}/my_avatar.png', 'authenticated', '{CUSTOMER_ID}', true);
    
    -- 2. Test attendance-selfie upload
    PERFORM run_test('2. Legitimate selfie upload', 'attendance-selfies', '{CUSTOMER_ID}/selfie.png', 'authenticated', '{CUSTOMER_ID}', true);
    
    -- 3. Test resume upload
    PERFORM run_test('3. Legitimate resume upload', 'resumes', '{CUSTOMER_ID}/resume.pdf', 'authenticated', '{CUSTOMER_ID}', true);
    
    -- 4. Test merchant banner upload
    PERFORM run_test('4. Legitimate merchant banner', 'merchant_banners', '{MERCHANT_ID}/banner.png', 'authenticated', '{MERCHANT_ID}', true);
    
    -- 5. Test merchant product-image upload
    PERFORM run_test('5. Legitimate merchant product-image', 'product-images', 'merchant/{MERCHANT_ID}/product.png', 'authenticated', '{MERCHANT_ID}', true);
    
    -- 6. Test Admin product-image upload
    PERFORM run_test('6. Admin product-image upload', 'product-images', 'promo/new_product.png', 'authenticated', '{ADMIN_ID}', true);
    
    -- 7. Test Admin/HR payslip upload
    PERFORM run_test('7. Admin payslip upload', 'payslips', '{CUSTOMER_ID}/payslip_jan.pdf', 'authenticated', '{ADMIN_ID}', true);
    PERFORM run_test('7b. Non-admin payslip upload (Should Fail)', 'payslips', '{CUSTOMER_ID}/payslip_jan.pdf', 'authenticated', '{CUSTOMER_ID}', false);
    
    -- 8. Test Admin banner/gift-card uploads
    PERFORM run_test('8. Admin banner upload', 'banners', 'home_banner.png', 'authenticated', '{ADMIN_ID}', true);
    PERFORM run_test('8b. Admin gift-card upload', 'gift-cards', 'diwali_card.png', 'authenticated', '{ADMIN_ID}', true);
    PERFORM run_test('8c. Merchant banner upload (Should Fail)', 'banners', 'home_banner.png', 'authenticated', '{MERCHANT_ID}', false);
    
    -- 9. Test that an authenticated user cannot upload into another user's UUID folder
    PERFORM run_test('9. Upload to another user folder', 'avatars', '{OTHER_USER_ID}/avatar.png', 'authenticated', '{CUSTOMER_ID}', false);
    
    -- 10. Test that a merchant cannot upload into another merchant's folder
    PERFORM run_test('10. Upload to another merchant product folder', 'product-images', 'merchant/{OTHER_USER_ID}/product.png', 'authenticated', '{MERCHANT_ID}', false);
    
    -- 11. Test that anon users cannot upload
    PERFORM run_test('11. Anon user upload', 'avatars', 'some_anon_folder/avatar.png', 'anon', '', false);

    -- Cleanup
    PERFORM set_config('role', 'postgres', true);
    DELETE FROM storage.objects WHERE bucket_id IN ('avatars', 'attendance-selfies', 'resumes', 'merchant_banners', 'product-images', 'payslips', 'banners', 'gift-cards') AND updated_at >= now() - interval '1 minute';
    
    RAISE NOTICE '--- END STORAGE RLS TESTS ---';
END;
$$;
"""

print("Connecting to VPS...")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PW)

# Execute via psql
cmd = "docker exec -i supabase-db psql -U postgres -d postgres"
stdin, stdout, stderr = c.exec_command(cmd)
stdin.write(sql_script.encode('utf-8'))
stdin.close()

# Print results
out = stdout.read().decode('utf-8')
err = stderr.read().decode('utf-8')

for line in err.splitlines():
    if line.startswith("NOTICE:"):
        print(line.replace("NOTICE:  ", ""))

c.close()
