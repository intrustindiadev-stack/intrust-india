-- ============================================================
-- Drop Stale Team Management RPC Overloads
-- Migration Date: 2026-08-06
--
-- Problem: Multiple migrations created successive overloads of
-- admin_add_team_member, admin_create_team, admin_remove_team_member
-- without dropping previous versions. This creates PostgreSQL
-- function overload ambiguity and leaves stale versions that
-- check for the deprecated 'sales_manager' role.
--
-- This migration drops the old overloads and ensures only the
-- canonical 5-parameter hardened versions remain.
-- ============================================================

-- Drop old 2-parameter overload (from 20260730_team_management_schema.sql)
-- This version used auth.uid() internally and checked for 'sales_manager'
DROP FUNCTION IF EXISTS public.admin_add_team_member(UUID, UUID);

-- Drop old 3-parameter overload (from 20260730_fix_team_rpc_caller_id.sql)
-- This version used COALESCE(p_caller_id, auth.uid()) but still checked 'sales_manager'
DROP FUNCTION IF EXISTS public.admin_add_team_member(UUID, UUID, UUID);

-- Drop old 2-parameter create team (from 20260730_team_management_schema.sql)
DROP FUNCTION IF EXISTS public.admin_create_team(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT);

-- Drop old 10-parameter create team (from 20260730_fix_team_rpc_caller_id.sql, had p_caller_id but no p_request_id)
DROP FUNCTION IF EXISTS public.admin_create_team(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID);

-- Drop old 2-parameter remove team member (from 20260730_team_management_schema.sql)
DROP FUNCTION IF EXISTS public.admin_remove_team_member(UUID);

-- Drop old 3-parameter remove team member (from 20260730_fix_team_rpc_caller_id.sql)
DROP FUNCTION IF EXISTS public.admin_remove_team_member(UUID, UUID);

-- ============================================================
-- Verify canonical versions still exist (should return 1 row each)
-- ============================================================
DO $$
DECLARE
    v_count INT;
BEGIN
    -- admin_add_team_member: exactly 1 version (5 params)
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'admin_add_team_member';
    
    IF v_count != 1 THEN
        RAISE EXCEPTION 'Expected 1 admin_add_team_member overload, found %', v_count;
    END IF;
    
    -- admin_create_team: exactly 1 version (11 params)
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'admin_create_team';
    
    IF v_count != 1 THEN
        RAISE EXCEPTION 'Expected 1 admin_create_team overload, found %', v_count;
    END IF;
    
    -- admin_remove_team_member: exactly 1 version (5 params)
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'admin_remove_team_member';
    
    IF v_count != 1 THEN
        RAISE EXCEPTION 'Expected 1 admin_remove_team_member overload, found %', v_count;
    END IF;
    
    RAISE NOTICE 'All stale RPC overloads removed. Canonical versions verified. ✓';
END;
$$;
