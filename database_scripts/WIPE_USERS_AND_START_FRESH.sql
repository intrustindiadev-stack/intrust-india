-- ==========================================================
-- SUPER DESTRUCTIVE ACTION: WIPE ALL USERS AND START FRESH
-- ==========================================================
-- This script deletes ALL users from Supabase Auth and all
-- linked data in public tables. Use with extreme caution.

-- 1. Disable triggers temporarily if needed (optional but safer)
-- SET session_replication_role = 'replica';

-- 1. Delete from dependent tables in order (Safe Check)
DO $$ 
DECLARE
    t_name TEXT;
    target_tables TEXT[] := ARRAY[
        'kyc_records', 
        'merchants', 
        'orders', 
        'giftcards_purchased', 
        'coupons_purchased', 
        'sabpaisa_transactions', 
        'user_profiles'
    ];
BEGIN
    FOREACH t_name IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE', t_name);
        END IF;
    END LOOP;
END $$;

-- 2. Delete all users from Supabase Auth
DELETE FROM auth.users;

-- 4. Re-enable triggers (optional)
-- SET session_replication_role = 'origin';

-- ==========================================================
-- SUCCESS: Database is now clean for fresh testing.
-- ==========================================================
