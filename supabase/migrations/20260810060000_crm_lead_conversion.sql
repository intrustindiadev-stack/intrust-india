-- =============================================================================
-- Migration: 20260810060000_crm_lead_conversion.sql
-- Purpose   : Add V1 CRM Lead → Customer / Merchant conversion layer.
--
-- What this migration does:
--   1. Adds 5 new columns to crm_leads for lifecycle + conversion tracking.
--   2. Creates two partial unique indexes to prevent duplicate conversions.
--   3. Creates crm_check_customer_for_lead() — read-only duplicate check RPC.
--   4. Creates crm_check_merchant_for_lead() — read-only duplicate check RPC.
--   5. Creates crm_convert_lead_to_customer() — SECURITY DEFINER conversion RPC.
--   6. Creates crm_convert_lead_to_merchant() — SECURITY DEFINER conversion RPC.
--
-- What this migration does NOT do:
--   - Does NOT create a customers table.
--   - Does NOT create auth accounts or user_profiles stubs.
--   - Does NOT backfill historical leads.
--   - Does NOT modify existing CRM routing, RLS, or lead assignment logic.
--   - Does NOT alter status = 'won' on existing leads.
--   - Does NOT approve merchants.
--   - Does NOT touch organization management or HRM.
--
-- Idempotent: uses IF NOT EXISTS, CREATE OR REPLACE, DO $$ guards.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Add conversion columns to crm_leads
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_leads
    ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active'
        CHECK (lifecycle_status IN ('active', 'converted_customer', 'converted_merchant', 'converted_both', 'lost', 'archived')),

    ADD COLUMN IF NOT EXISTS converted_user_id UUID
        REFERENCES public.user_profiles(id) ON DELETE SET NULL,

    ADD COLUMN IF NOT EXISTS converted_merchant_id UUID
        REFERENCES public.merchants(id) ON DELETE SET NULL,

    ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,

    ADD COLUMN IF NOT EXISTS converted_by UUID
        REFERENCES public.user_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.crm_leads.lifecycle_status IS
    'Tracks the conversion state: active (default), converted_customer, converted_merchant, converted_both, lost, archived';

COMMENT ON COLUMN public.crm_leads.converted_user_id IS
    'FK to user_profiles — the existing customer account this lead was linked to. Set only when an existing account was matched; never creates a new account.';

COMMENT ON COLUMN public.crm_leads.converted_merchant_id IS
    'FK to merchants — the existing merchant this lead was linked to. Set only when an existing merchant record was matched.';

COMMENT ON COLUMN public.crm_leads.converted_at IS
    'Timestamp of when the conversion was recorded by the CRM actor.';

COMMENT ON COLUMN public.crm_leads.converted_by IS
    'FK to user_profiles — the RM / admin who performed the conversion.';

-- ---------------------------------------------------------------------------
-- STEP 2: Partial unique indexes — enforce one lead per customer/merchant
--
-- These prevent two independent leads from both claiming the same customer
-- or merchant as their conversion target (without an explicit dedup workflow).
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_leads_converted_user
    ON public.crm_leads(converted_user_id)
    WHERE converted_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_leads_converted_merchant
    ON public.crm_leads(converted_merchant_id)
    WHERE converted_merchant_id IS NOT NULL;

-- Performance index for admin queries looking up originating leads
CREATE INDEX IF NOT EXISTS idx_crm_leads_lifecycle_status
    ON public.crm_leads(lifecycle_status)
    WHERE lifecycle_status <> 'active';

-- ---------------------------------------------------------------------------
-- STEP 3: RPC — crm_check_customer_for_lead
--
-- Read-only. Given a lead_id, returns a matching user_profiles row (if any)
-- by phone or email. Used by the UI before showing the conversion modal.
-- Enforces CRM RBAC: only CRM roles + admins may call.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.crm_check_customer_for_lead(
    p_lead_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id      UUID;
    v_caller_role    TEXT;
    v_lead           RECORD;
    v_user           RECORD;
    v_lead_phone_n   TEXT;
    v_user_phone_n   TEXT;
BEGIN
    -- Auth: get calling user
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Unauthorized');
    END IF;

    -- Auth: verify CRM-authorized role
    SELECT role::TEXT INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('relationship_exec', 'relationship_manager', 'admin', 'super_admin') THEN
        RETURN jsonb_build_object('error', 'Forbidden: insufficient role');
    END IF;

    -- Load lead
    SELECT * INTO v_lead FROM public.crm_leads WHERE id = p_lead_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Lead not found');
    END IF;

    -- RBAC scope: exec can only check leads assigned to them
    IF v_caller_role = 'relationship_exec' AND v_lead.assigned_to IS DISTINCT FROM v_caller_id THEN
        RETURN jsonb_build_object('error', 'Forbidden: lead not assigned to you');
    END IF;

    -- Normalize lead phone for comparison
    v_lead_phone_n := public.normalize_in_phone(v_lead.phone);

    -- Search user_profiles by normalized phone (priority 1)
    IF v_lead_phone_n IS NOT NULL THEN
        SELECT * INTO v_user
        FROM public.user_profiles
        WHERE public.normalize_in_phone(phone) = v_lead_phone_n
          AND role = 'user'
        LIMIT 1;
    END IF;

    -- If phone miss, try email (skip pseudo phone emails)
    IF v_user.id IS NULL AND v_lead.email IS NOT NULL AND v_lead.email NOT LIKE '%@phone.intrust.internal' THEN
        SELECT * INTO v_user
        FROM public.user_profiles
        WHERE email = v_lead.email
          AND role = 'user'
          AND email NOT LIKE '%@phone.intrust.internal'
        LIMIT 1;
    END IF;

    IF v_user.id IS NULL THEN
        RETURN jsonb_build_object(
            'found', FALSE,
            'message', 'Customer account not found. The customer must have an InTrust account before this lead can be converted.'
        );
    END IF;

    -- Check if this user is already the target of another lead
    IF EXISTS (
        SELECT 1 FROM public.crm_leads
        WHERE converted_user_id = v_user.id
          AND id <> p_lead_id
    ) THEN
        RETURN jsonb_build_object(
            'found', TRUE,
            'already_claimed', TRUE,
            'message', 'This customer is already linked to another CRM lead.',
            'user', jsonb_build_object(
                'id', v_user.id,
                'full_name', v_user.full_name,
                'phone', v_user.phone,
                'email', v_user.email,
                'kyc_status', v_user.kyc_status,
                'role', v_user.role
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'found', TRUE,
        'already_claimed', FALSE,
        'user', jsonb_build_object(
            'id', v_user.id,
            'full_name', v_user.full_name,
            'phone', v_user.phone,
            'email', v_user.email,
            'kyc_status', v_user.kyc_status,
            'role', v_user.role
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.crm_check_customer_for_lead(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_check_customer_for_lead(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- STEP 4: RPC — crm_check_merchant_for_lead
--
-- Read-only. Given a lead_id, returns a matching merchants row (if any)
-- by business_phone or business_email or via user_profiles phone/email.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.crm_check_merchant_for_lead(
    p_lead_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id      UUID;
    v_caller_role    TEXT;
    v_lead           RECORD;
    v_merchant       RECORD;
    v_lead_phone_n   TEXT;
    v_biz_phone_n    TEXT;
BEGIN
    -- Auth: get calling user
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Unauthorized');
    END IF;

    -- Auth: verify CRM-authorized role
    SELECT role::TEXT INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('relationship_exec', 'relationship_manager', 'admin', 'super_admin') THEN
        RETURN jsonb_build_object('error', 'Forbidden: insufficient role');
    END IF;

    -- Load lead
    SELECT * INTO v_lead FROM public.crm_leads WHERE id = p_lead_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Lead not found');
    END IF;

    -- RBAC scope: exec can only check leads assigned to them
    IF v_caller_role = 'relationship_exec' AND v_lead.assigned_to IS DISTINCT FROM v_caller_id THEN
        RETURN jsonb_build_object('error', 'Forbidden: lead not assigned to you');
    END IF;

    -- Normalize lead phone
    v_lead_phone_n := public.normalize_in_phone(v_lead.phone);

    -- Priority 1: match on normalized business_phone
    IF v_lead_phone_n IS NOT NULL THEN
        SELECT m.* INTO v_merchant
        FROM public.merchants m
        WHERE public.normalize_in_phone(m.business_phone) = v_lead_phone_n
        LIMIT 1;
    END IF;

    -- Priority 2: match on business_email
    IF v_merchant.id IS NULL AND v_lead.email IS NOT NULL AND v_lead.email NOT LIKE '%@phone.intrust.internal' THEN
        SELECT m.* INTO v_merchant
        FROM public.merchants m
        WHERE m.business_email = v_lead.email
        LIMIT 1;
    END IF;

    -- Priority 3: match via owner's user_profiles phone/email
    IF v_merchant.id IS NULL THEN
        SELECT m.* INTO v_merchant
        FROM public.merchants m
        JOIN public.user_profiles up ON up.id = m.user_id
        WHERE (
            (v_lead_phone_n IS NOT NULL AND public.normalize_in_phone(up.phone) = v_lead_phone_n)
            OR
            (v_lead.email IS NOT NULL AND v_lead.email NOT LIKE '%@phone.intrust.internal' AND up.email = v_lead.email)
        )
        LIMIT 1;
    END IF;

    IF v_merchant.id IS NULL THEN
        RETURN jsonb_build_object(
            'found', FALSE,
            'message', 'Merchant account not found. Please complete merchant onboarding before converting this lead.'
        );
    END IF;

    -- Check if this merchant is already the target of another lead
    IF EXISTS (
        SELECT 1 FROM public.crm_leads
        WHERE converted_merchant_id = v_merchant.id
          AND id <> p_lead_id
    ) THEN
        RETURN jsonb_build_object(
            'found', TRUE,
            'already_claimed', TRUE,
            'message', 'This merchant is already linked to another CRM lead.',
            'merchant', jsonb_build_object(
                'id', v_merchant.id,
                'business_name', v_merchant.business_name,
                'business_phone', v_merchant.business_phone,
                'business_email', v_merchant.business_email,
                'status', v_merchant.status,
                'owner_name', v_merchant.owner_name
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'found', TRUE,
        'already_claimed', FALSE,
        'merchant', jsonb_build_object(
            'id', v_merchant.id,
            'business_name', v_merchant.business_name,
            'business_phone', v_merchant.business_phone,
            'business_email', v_merchant.business_email,
            'status', v_merchant.status,
            'owner_name', v_merchant.owner_name
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.crm_check_merchant_for_lead(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_check_merchant_for_lead(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- STEP 5: RPC — crm_convert_lead_to_customer
--
-- SECURITY DEFINER. Links an existing user_profiles (role='user') to a lead.
-- Does NOT create a new account. Does NOT send SMS/WhatsApp.
-- Enforces full RBAC + identity match checks.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.crm_convert_lead_to_customer(
    p_lead_id  UUID,
    p_user_id  UUID,
    p_notes    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id       UUID;
    v_caller_role     TEXT;
    v_lead            RECORD;
    v_target_user     RECORD;
    v_prev_status     TEXT;
    v_prev_lifecycle  TEXT;
    v_new_lifecycle   TEXT;
    v_lead_phone_n    TEXT;
    v_user_phone_n    TEXT;
    v_phone_match     BOOLEAN := FALSE;
    v_email_match     BOOLEAN := FALSE;
BEGIN
    -- ── 1. Authentication ──────────────────────────────────────────────────
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized: no session');
    END IF;

    -- ── 2. Caller role check ───────────────────────────────────────────────
    SELECT role::TEXT INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('relationship_exec', 'relationship_manager', 'admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Forbidden: your role cannot perform lead conversions');
    END IF;

    -- ── 3. Load and lock the lead ──────────────────────────────────────────
    SELECT * INTO v_lead
    FROM public.crm_leads
    WHERE id = p_lead_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Lead not found');
    END IF;

    -- ── 4. RBAC scope check ────────────────────────────────────────────────
    -- relationship_exec: only their own assigned leads
    -- relationship_manager: their team's leads (assigned_team_id match)
    -- admin/super_admin: unrestricted
    IF v_caller_role = 'relationship_exec' THEN
        IF v_lead.assigned_to IS DISTINCT FROM v_caller_id THEN
            RETURN jsonb_build_object('success', FALSE, 'error', 'Forbidden: this lead is not assigned to you');
        END IF;
    ELSIF v_caller_role = 'relationship_manager' THEN
        DECLARE
            v_caller_team UUID;
        BEGIN
            SELECT team_id INTO v_caller_team FROM public.user_profiles WHERE id = v_caller_id;
            IF v_caller_team IS NULL OR v_lead.assigned_team_id IS DISTINCT FROM v_caller_team THEN
                -- Managers can also convert leads they personally created or are assigned to
                IF v_lead.assigned_to IS DISTINCT FROM v_caller_id AND v_lead.created_by IS DISTINCT FROM v_caller_id THEN
                    RETURN jsonb_build_object('success', FALSE, 'error', 'Forbidden: lead is outside your team scope');
                END IF;
            END IF;
        END;
    END IF;

    -- ── 5. Lead must not be archived ───────────────────────────────────────
    IF v_lead.archived_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Cannot convert an archived lead');
    END IF;

    -- ── 6. Lead must not already be converted to a customer ───────────────
    IF v_lead.converted_user_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'This lead has already been converted to a customer',
            'existing_user_id', v_lead.converted_user_id
        );
    END IF;

    -- ── 7. Verify the target user exists ──────────────────────────────────
    SELECT * INTO v_target_user
    FROM public.user_profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Target user not found in user_profiles');
    END IF;

    -- ── 8. Verify target is an application customer (role = user) ─────────
    IF v_target_user.role::TEXT <> 'user' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Target account is not a customer. Only accounts with role=''user'' can be linked as customers.'
        );
    END IF;

    -- ── 9. Identity match: lead phone or email must match user ────────────
    v_lead_phone_n := public.normalize_in_phone(v_lead.phone);
    v_user_phone_n := public.normalize_in_phone(v_target_user.phone);

    IF v_lead_phone_n IS NOT NULL AND v_user_phone_n IS NOT NULL AND v_lead_phone_n = v_user_phone_n THEN
        v_phone_match := TRUE;
    END IF;

    IF NOT v_phone_match
       AND v_lead.email IS NOT NULL
       AND v_lead.email NOT LIKE '%@phone.intrust.internal'
       AND v_target_user.email IS NOT NULL
       AND v_target_user.email NOT LIKE '%@phone.intrust.internal'
       AND lower(v_lead.email) = lower(v_target_user.email)
    THEN
        v_email_match := TRUE;
    END IF;

    IF NOT v_phone_match AND NOT v_email_match THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Identity mismatch: the selected customer''s phone and email do not match this lead. Please verify the correct account.'
        );
    END IF;

    -- ── 10. Compute new lifecycle_status ───────────────────────────────────
    v_prev_lifecycle := v_lead.lifecycle_status;
    v_prev_status    := v_lead.status::TEXT;

    v_new_lifecycle := CASE
        WHEN v_lead.lifecycle_status = 'converted_merchant' THEN 'converted_both'
        ELSE 'converted_customer'
    END;

    -- ── 11. Update crm_leads ───────────────────────────────────────────────
    UPDATE public.crm_leads
    SET
        converted_user_id  = p_user_id,
        converted_at       = NOW(),
        converted_by       = v_caller_id,
        lifecycle_status   = v_new_lifecycle,
        -- Mark as 'won' only if not already in a terminal status
        status             = CASE
                                WHEN status::TEXT IN ('won', 'lost') THEN status
                                ELSE 'won'::lead_status
                             END,
        updated_at         = NOW()
    WHERE id = p_lead_id;

    -- ── 12. Log to crm_lead_activities ────────────────────────────────────
    INSERT INTO public.crm_lead_activities (lead_id, actor_id, action_type, metadata)
    VALUES (
        p_lead_id,
        v_caller_id,
        'converted_to_customer',
        jsonb_build_object(
            'conversion_type',    'customer',
            'customer_id',        p_user_id,
            'customer_name',      v_target_user.full_name,
            'previous_status',    v_prev_status,
            'previous_lifecycle', v_prev_lifecycle,
            'new_lifecycle',      v_new_lifecycle,
            'actor_id',           v_caller_id,
            'match_method',       CASE WHEN v_phone_match THEN 'phone' ELSE 'email' END,
            'notes',              p_notes
        )
    );

    -- ── 13. Return success ─────────────────────────────────────────────────
    RETURN jsonb_build_object(
        'success',         TRUE,
        'lead_id',         p_lead_id,
        'user_id',         p_user_id,
        'lifecycle_status', v_new_lifecycle,
        'converted_at',    NOW(),
        'message',         'Lead successfully converted to customer'
    );

EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'This customer account is already linked to another lead. A customer can only be the conversion target of one lead.'
    );
WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION public.crm_convert_lead_to_customer(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_convert_lead_to_customer(UUID, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- STEP 6: RPC — crm_convert_lead_to_merchant
--
-- SECURITY DEFINER. Links an existing merchants record to a lead.
-- Does NOT modify merchant.status.
-- Does NOT approve a merchant (that remains in the existing workflow).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.crm_convert_lead_to_merchant(
    p_lead_id     UUID,
    p_merchant_id UUID,
    p_notes       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id       UUID;
    v_caller_role     TEXT;
    v_lead            RECORD;
    v_merchant        RECORD;
    v_owner_profile   RECORD;
    v_prev_status     TEXT;
    v_prev_lifecycle  TEXT;
    v_new_lifecycle   TEXT;
    v_lead_phone_n    TEXT;
    v_biz_phone_n     TEXT;
    v_own_phone_n     TEXT;
    v_phone_match     BOOLEAN := FALSE;
    v_email_match     BOOLEAN := FALSE;
BEGIN
    -- ── 1. Authentication ──────────────────────────────────────────────────
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized: no session');
    END IF;

    -- ── 2. Caller role check ───────────────────────────────────────────────
    SELECT role::TEXT INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('relationship_exec', 'relationship_manager', 'admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Forbidden: your role cannot perform lead conversions');
    END IF;

    -- ── 3. Load and lock the lead ──────────────────────────────────────────
    SELECT * INTO v_lead
    FROM public.crm_leads
    WHERE id = p_lead_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Lead not found');
    END IF;

    -- ── 4. RBAC scope check ────────────────────────────────────────────────
    IF v_caller_role = 'relationship_exec' THEN
        IF v_lead.assigned_to IS DISTINCT FROM v_caller_id THEN
            RETURN jsonb_build_object('success', FALSE, 'error', 'Forbidden: this lead is not assigned to you');
        END IF;
    ELSIF v_caller_role = 'relationship_manager' THEN
        DECLARE
            v_caller_team UUID;
        BEGIN
            SELECT team_id INTO v_caller_team FROM public.user_profiles WHERE id = v_caller_id;
            IF v_caller_team IS NULL OR v_lead.assigned_team_id IS DISTINCT FROM v_caller_team THEN
                IF v_lead.assigned_to IS DISTINCT FROM v_caller_id AND v_lead.created_by IS DISTINCT FROM v_caller_id THEN
                    RETURN jsonb_build_object('success', FALSE, 'error', 'Forbidden: lead is outside your team scope');
                END IF;
            END IF;
        END;
    END IF;

    -- ── 5. Lead must not be archived ───────────────────────────────────────
    IF v_lead.archived_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Cannot convert an archived lead');
    END IF;

    -- ── 6. Lead must not already be converted to a merchant ───────────────
    IF v_lead.converted_merchant_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'This lead has already been converted to a merchant',
            'existing_merchant_id', v_lead.converted_merchant_id
        );
    END IF;

    -- ── 7. Verify the target merchant exists ──────────────────────────────
    SELECT m.*, up.phone AS owner_phone, up.email AS owner_email INTO v_merchant
    FROM public.merchants m
    JOIN public.user_profiles up ON up.id = m.user_id
    WHERE m.id = p_merchant_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Merchant not found');
    END IF;

    -- ── 8. Identity match check ────────────────────────────────────────────
    v_lead_phone_n := public.normalize_in_phone(v_lead.phone);
    v_biz_phone_n  := public.normalize_in_phone(v_merchant.business_phone);
    v_own_phone_n  := public.normalize_in_phone(v_merchant.owner_phone);

    -- Phone match: lead phone vs business_phone or owner phone
    IF v_lead_phone_n IS NOT NULL THEN
        IF (v_biz_phone_n IS NOT NULL AND v_lead_phone_n = v_biz_phone_n)
           OR (v_own_phone_n IS NOT NULL AND v_lead_phone_n = v_own_phone_n) THEN
            v_phone_match := TRUE;
        END IF;
    END IF;

    -- Email match: lead email vs business_email or owner email
    IF NOT v_phone_match
       AND v_lead.email IS NOT NULL
       AND v_lead.email NOT LIKE '%@phone.intrust.internal'
    THEN
        IF (v_merchant.business_email IS NOT NULL AND lower(v_lead.email) = lower(v_merchant.business_email))
           OR (v_merchant.owner_email IS NOT NULL AND v_merchant.owner_email NOT LIKE '%@phone.intrust.internal' AND lower(v_lead.email) = lower(v_merchant.owner_email)) THEN
            v_email_match := TRUE;
        END IF;
    END IF;

    IF NOT v_phone_match AND NOT v_email_match THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Identity mismatch: the selected merchant''s phone and email do not match this lead. Please verify the correct merchant.'
        );
    END IF;

    -- ── 9. Compute new lifecycle_status ────────────────────────────────────
    v_prev_lifecycle := v_lead.lifecycle_status;
    v_prev_status    := v_lead.status::TEXT;

    v_new_lifecycle := CASE
        WHEN v_lead.lifecycle_status = 'converted_customer' THEN 'converted_both'
        ELSE 'converted_merchant'
    END;

    -- ── 10. Update crm_leads ───────────────────────────────────────────────
    UPDATE public.crm_leads
    SET
        converted_merchant_id = p_merchant_id,
        converted_at          = NOW(),
        converted_by          = v_caller_id,
        lifecycle_status      = v_new_lifecycle,
        -- Mark as 'won' only if not already in a terminal status
        status                = CASE
                                    WHEN status::TEXT IN ('won', 'lost') THEN status
                                    ELSE 'won'::lead_status
                                 END,
        updated_at            = NOW()
    WHERE id = p_lead_id;

    -- ── 11. Log to crm_lead_activities ────────────────────────────────────
    INSERT INTO public.crm_lead_activities (lead_id, actor_id, action_type, metadata)
    VALUES (
        p_lead_id,
        v_caller_id,
        'converted_to_merchant',
        jsonb_build_object(
            'conversion_type',    'merchant',
            'merchant_id',        p_merchant_id,
            'merchant_name',      v_merchant.business_name,
            'previous_status',    v_prev_status,
            'previous_lifecycle', v_prev_lifecycle,
            'new_lifecycle',      v_new_lifecycle,
            'actor_id',           v_caller_id,
            'match_method',       CASE WHEN v_phone_match THEN 'phone' ELSE 'email' END,
            'notes',              p_notes
        )
    );

    -- ── 12. Return success ─────────────────────────────────────────────────
    RETURN jsonb_build_object(
        'success',          TRUE,
        'lead_id',          p_lead_id,
        'merchant_id',      p_merchant_id,
        'lifecycle_status', v_new_lifecycle,
        'converted_at',     NOW(),
        'message',          'Lead successfully converted to merchant'
    );

EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'This merchant is already linked to another lead. A merchant can only be the conversion target of one lead.'
    );
WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION public.crm_convert_lead_to_merchant(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_convert_lead_to_merchant(UUID, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- PostgREST schema cache reload
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
