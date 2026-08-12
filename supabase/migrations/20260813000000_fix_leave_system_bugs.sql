-- ============================================================================
-- MIGRATION: 20260813000000_fix_leave_system_bugs.sql
-- Description: Fix Leave System Bugs
--   1. Drop old RPC overloads (from migration 20260801160000)
--   2. Reconcile stale used_days discrepancy
--   3. Seed missing employee leave balances for 2026 (employees added post-publish)
-- Author: Intrust Engineering
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP OLD FUNCTION OVERLOADS
-- The original migration (20260801) created old-signature RPCs.
-- The new migration (20260802) created new-signature RPCs with additional params.
-- Both overloads coexist. We drop the old ones to prevent confusion.
-- ----------------------------------------------------------------------------

-- Drop old submit_leave_request (4-param, no p_employee_id)
DROP FUNCTION IF EXISTS public.submit_leave_request(text, date, date, text);

-- Drop old cancel_leave_request (2-param, no p_actor_id)
DROP FUNCTION IF EXISTS public.cancel_leave_request(uuid, text);

-- Drop old review_leave_request (superseded by hr_review_leave_request + admin_review_leave_request)
-- Note: The live DB had a 4-param version (added p_actor_id) from an intermediate migration
DROP FUNCTION IF EXISTS public.review_leave_request(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.review_leave_request(uuid, text, text);

-- ----------------------------------------------------------------------------
-- 2. RECONCILE STALE used_days ON employee_leave_balances
-- The audit found 1 employee with used_days=2 but 0 approved requests.
-- This was caused by a pre-migration approved request that was later 
-- cancelled in a way that didn't restore used_days (old workflow).
-- We rebuild both reserved_days and used_days from actual leave_requests.
-- ----------------------------------------------------------------------------

UPDATE public.employee_leave_balances elb
SET
    reserved_days = COALESCE((
        SELECT SUM(COALESCE(lr.chargeable_days, 0))
        FROM public.leave_requests lr
        WHERE lr.employee_id = elb.employee_id
          AND lr.policy_year = elb.policy_year
          AND lr.leave_type = elb.leave_type
          AND lr.status IN ('pending_hr_review', 'pending_admin_confirmation')
    ), 0),
    used_days = COALESCE((
        SELECT SUM(COALESCE(lr.chargeable_days, 0))
        FROM public.leave_requests lr
        WHERE lr.employee_id = elb.employee_id
          AND lr.policy_year = elb.policy_year
          AND lr.leave_type = elb.leave_type
          AND lr.status = 'approved'
    ), 0),
    version = version + 1,
    updated_at = now()
WHERE elb.policy_year = 2026;

-- ----------------------------------------------------------------------------
-- 3. SEED MISSING LEAVE BALANCES
-- Employees added after the policy year was published have no balance rows.
-- This mimics what publish_leave_policy_year does for new employees.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_year_rec record;
    v_pol record;
    v_emp record;
    v_created_count int := 0;
BEGIN
    -- Get the published 2026 policy year
    SELECT * INTO v_year_rec 
    FROM public.leave_policy_years 
    WHERE policy_year = 2026 AND status = 'published'
    LIMIT 1;

    IF v_year_rec.id IS NULL THEN
        RAISE NOTICE 'No published 2026 policy year found, skipping balance seeding.';
        RETURN;
    END IF;

    -- For each active policy in 2026
    FOR v_pol IN 
        SELECT * FROM public.leave_policies 
        WHERE policy_year_id = v_year_rec.id AND is_active = true
    LOOP
        -- For each workforce employee missing a balance row for this policy
        FOR v_emp IN 
            SELECT up.id FROM public.user_profiles up
            WHERE up.role IN (
                'employee', 'hr_manager', 'relationship_exec', 'relationship_manager',
                'freelancer', 'video_editor', 'social_media_manager',
                'seo_specialist', 'advertiser', 'support_agent'
            )
            AND NOT EXISTS (
                SELECT 1 FROM public.employee_leave_balances elb2
                WHERE elb2.employee_id = up.id
                  AND elb2.policy_year = 2026
                  AND elb2.leave_type = v_pol.leave_type_key
            )
        LOOP
            INSERT INTO public.employee_leave_balances (
                employee_id, policy_year, leave_type, policy_id, entitled_days
            ) VALUES (
                v_emp.id, 2026, v_pol.leave_type_key, v_pol.id, v_pol.annual_entitlement
            )
            ON CONFLICT (employee_id, policy_year, leave_type) DO NOTHING;
            
            v_created_count := v_created_count + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Created % missing leave balance rows for 2026.', v_created_count;
END $$;

-- ----------------------------------------------------------------------------
-- 4. AUDIT LOG THE RECONCILIATION
-- ----------------------------------------------------------------------------

INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, new_data, module, severity)
SELECT 
    (SELECT id FROM public.user_profiles WHERE role = 'super_admin' LIMIT 1),
    'Leave system reconciliation',
    'employee_leave_balances',
    gen_random_uuid(),
    jsonb_build_object(
        'action', 'reconcile_balance_discrepancies',
        'migration', '20260813000000_fix_leave_system_bugs',
        'note', 'Dropped old RPC overloads, reconciled stale used_days, seeded missing balances'
    ),
    'Leaves',
    'high'
WHERE EXISTS (SELECT 1 FROM public.audit_logs_hrm LIMIT 1);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
