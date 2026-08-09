-- =============================================================================
-- Migration: 20260810070000_crm_1_to_n_conversions.sql
-- Purpose   : Remove strict 1:1 constraint for CRM conversions, allowing
--             a single customer or merchant to have multiple CRM leads
--             over time (1:N) for cross-selling and renewals.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Remove the overly restrictive unique indexes
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_crm_leads_converted_user;
DROP INDEX IF EXISTS public.idx_crm_leads_converted_merchant;

-- ---------------------------------------------------------------------------
-- STEP 2: Update RPC — crm_check_customer_for_lead
--
-- No longer blocks on "already claimed". Now fetches existing lead history.
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
    v_lead           public.crm_leads%ROWTYPE;
    v_user           public.user_profiles%ROWTYPE;
    v_lead_phone_n   TEXT;
    v_user_phone_n   TEXT;
    v_existing_count INT := 0;
    v_recent_leads   JSONB := '[]'::jsonb;
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

    -- Fetch existing CRM lead history for this customer
    SELECT count(*) INTO v_existing_count
    FROM public.crm_leads
    WHERE converted_user_id = v_user.id
      AND id <> p_lead_id;

    IF v_existing_count > 0 THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', id,
                'status', status,
                'converted_at', converted_at
            )
        ), '[]'::jsonb) INTO v_recent_leads
        FROM (
            SELECT id, status, converted_at
            FROM public.crm_leads
            WHERE converted_user_id = v_user.id
              AND id <> p_lead_id
            ORDER BY converted_at DESC NULLS LAST
            LIMIT 3
        ) sub;
    END IF;

    RETURN jsonb_build_object(
        'found', TRUE,
        'user', jsonb_build_object(
            'id', v_user.id,
            'full_name', v_user.full_name,
            'phone', v_user.phone,
            'email', v_user.email,
            'kyc_status', v_user.kyc_status,
            'role', v_user.role
        ),
        'existing_leads_info', jsonb_build_object(
            'count', v_existing_count,
            'recent_leads', v_recent_leads
        )
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 3: Update RPC — crm_check_merchant_for_lead
--
-- No longer blocks on "already claimed". Now fetches existing lead history.
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
    v_lead           public.crm_leads%ROWTYPE;
    v_merchant       public.merchants%ROWTYPE;
    v_lead_phone_n   TEXT;
    v_biz_phone_n    TEXT;
    v_existing_count INT := 0;
    v_recent_leads   JSONB := '[]'::jsonb;
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

    -- Fetch existing CRM lead history for this merchant
    SELECT count(*) INTO v_existing_count
    FROM public.crm_leads
    WHERE converted_merchant_id = v_merchant.id
      AND id <> p_lead_id;

    IF v_existing_count > 0 THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', id,
                'status', status,
                'converted_at', converted_at
            )
        ), '[]'::jsonb) INTO v_recent_leads
        FROM (
            SELECT id, status, converted_at
            FROM public.crm_leads
            WHERE converted_merchant_id = v_merchant.id
              AND id <> p_lead_id
            ORDER BY converted_at DESC NULLS LAST
            LIMIT 3
        ) sub;
    END IF;

    RETURN jsonb_build_object(
        'found', TRUE,
        'merchant', jsonb_build_object(
            'id', v_merchant.id,
            'business_name', v_merchant.business_name,
            'business_phone', v_merchant.business_phone,
            'business_email', v_merchant.business_email,
            'status', v_merchant.status,
            'owner_name', v_merchant.owner_name
        ),
        'existing_leads_info', jsonb_build_object(
            'count', v_existing_count,
            'recent_leads', v_recent_leads
        )
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 4: Update RPC — crm_convert_lead_to_customer
--
-- Remove duplicate prevention. Allow multiple leads to link to one customer.
-- Keeps internal lead protection (a lead can't be converted twice).
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
END;
$$;


-- ---------------------------------------------------------------------------
-- STEP 5: Update RPC — crm_convert_lead_to_merchant
--
-- Remove duplicate prevention. Allow multiple leads to link to one merchant.
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
END;
$$;

-- ---------------------------------------------------------------------------
-- PostgREST schema cache reload
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
