-- Backfill system-generated badge codes (EMP + 5 digits) for every
-- user_profiles row whose employee_id is NULL or blank.
--
-- SAFE: only touches rows with no badge. The 5 existing legacy codes
-- (1100, INT003, Intrust2000, Intrust260727, IFSIPL0826/271) are untouched.
-- Uniqueness backstop: partial unique index
-- idx_user_profiles_employee_id_unique WHERE employee_id IS NOT NULL.
-- FK joins everywhere use the UUID id, never this badge — no FK migration.
DO $$
DECLARE
    r RECORD;
    new_code TEXT;
    tries INT;
BEGIN
    FOR r IN
        SELECT id FROM public.user_profiles
        WHERE NULLIF(BTRIM(employee_id), '') IS NULL
    LOOP
        tries := 0;
        LOOP
            tries := tries + 1;
            new_code := 'EMP' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::INT::TEXT, 5, '0');
            BEGIN
                UPDATE public.user_profiles
                SET employee_id = new_code, updated_at = NOW()
                WHERE id = r.id;
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                IF tries >= 25 THEN
                    RAISE WARNING 'backfill: could not assign code for % after 25 tries', r.id;
                    EXIT;
                END IF;
                -- else retry with a fresh random code
            END;
        END LOOP;
    END LOOP;
END
$$;

-- Report leftovers (should be 0 rows after backfill)
-- SELECT count(*) FROM public.user_profiles WHERE NULLIF(BTRIM(employee_id), '') IS NULL;
