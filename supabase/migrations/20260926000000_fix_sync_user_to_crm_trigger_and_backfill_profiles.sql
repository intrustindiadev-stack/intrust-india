-- Migration: 20260926000000_fix_sync_user_to_crm_trigger_and_backfill_profiles.sql
-- Description:
-- 1. Fix sync_user_to_crm() trigger function to use NEW.role::text = 'user' instead of
--    evaluating NEW.role = 'customer', which failed with "invalid input value for enum user_role: 'customer'"
--    and caused silent failure of user_profiles insertion in handle_new_user().
-- 2. Update admin_update_user_role() RPC to accept 'user' role and normalize 'customer' -> 'user'.
-- 3. Backfill missing user_profiles rows for auth.users records that failed during handle_new_user().

-- ── 1. Fix sync_user_to_crm() Trigger Function ──────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_user_to_crm()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM public.user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    IF admin_id IS NULL THEN
        admin_id := NEW.id;
    END IF;

    -- In user_profiles, standard customers have role = 'user' (enum user_role does not have 'customer')
    IF NEW.role::text = 'user' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.crm_leads 
            WHERE (source_system = 'users' AND external_lead_id = NEW.id::text)
               OR (NEW.email IS NOT NULL AND NEW.email != '' AND email = NEW.email)
               OR (NEW.phone IS NOT NULL AND NEW.phone != '' AND phone = NEW.phone)
        ) THEN
            INSERT INTO public.crm_leads (
                title,
                contact_name,
                phone,
                email,
                source,
                source_system,
                external_lead_id,
                status,
                assigned_to,
                created_by,
                city,
                state
            ) VALUES (
                COALESCE(NEW.full_name, 'User') || ' (User)',
                COALESCE(NEW.full_name, 'User'),
                NEW.phone,
                NEW.email,
                'Users',
                'users',
                NEW.id::text,
                'new',
                NULL,
                admin_id,
                NEW.city,
                NEW.state
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 2. Fix admin_update_user_role() ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_user_role(p_target_user_id uuid, p_new_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_caller_id   UUID;
    v_caller_role TEXT;
    v_old_role    TEXT;
    v_normalized_role TEXT;
    v_valid_roles TEXT[] := ARRAY[
        'user', 'merchant', 'admin', 'super_admin',
        'sales_exec', 'sales_manager',
        'hr_manager', 'employee',
        'relationship_exec', 'relationship_manager',
        'freelancer', 'video_editor', 'social_media_manager',
        'seo_specialist', 'advertiser', 'support_agent'
    ];
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT role::text INTO v_caller_role
    FROM public.user_profiles WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
    END IF;

    -- Normalize 'customer' -> 'user'
    v_normalized_role := CASE WHEN p_new_role = 'customer' THEN 'user' ELSE p_new_role END;

    IF NOT (v_normalized_role = ANY(v_valid_roles)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role: ' || p_new_role);
    END IF;

    IF v_normalized_role = 'super_admin' AND v_caller_role != 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only super_admin can grant super_admin role');
    END IF;

    IF v_caller_id = p_target_user_id AND v_normalized_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot remove your own admin privileges');
    END IF;

    SELECT role::text INTO v_old_role
    FROM public.user_profiles WHERE id = p_target_user_id;

    IF v_old_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target user not found');
    END IF;

    IF v_old_role = v_normalized_role THEN
        RETURN jsonb_build_object('success', true, 'message', 'Role unchanged');
    END IF;

    UPDATE public.user_profiles
    SET role = v_normalized_role::user_role,
        updated_at = NOW()
    WHERE id = p_target_user_id;

    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', v_normalized_role),
        updated_at = NOW()
    WHERE id = p_target_user_id;

    INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id,
        'ROLE_CHANGE',
        'user_profiles',
        p_target_user_id,
        jsonb_build_object('role', v_old_role),
        jsonb_build_object('role', v_normalized_role)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Role updated from ' || v_old_role || ' to ' || v_normalized_role
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;


-- ── 3. Backfill Missing user_profiles for Existing auth.users ───────────────
DO $$
DECLARE
    u RECORD;
    v_name TEXT;
    v_avatar TEXT;
    v_provider TEXT;
    v_phone TEXT;
    v_count INT := 0;
BEGIN
    FOR u IN (
        SELECT auth_u.* 
        FROM auth.users auth_u 
        LEFT JOIN public.user_profiles p ON auth_u.id = p.id 
        WHERE p.id IS NULL
    ) LOOP
        v_name := COALESCE(
            u.raw_user_meta_data->>'full_name',
            u.raw_user_meta_data->>'name',
            'New User'
        );
        v_avatar := u.raw_user_meta_data->>'avatar_url';
        v_provider := COALESCE(u.raw_app_meta_data->>'provider', 'phone_otp');
        IF v_provider = 'phone' THEN
            v_provider := 'phone_otp';
        END IF;

        v_phone := u.phone;
        IF v_phone IS NOT NULL AND v_phone != '' THEN
            IF EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE right(regexp_replace(phone, '\D', '', 'g'), 10) = right(regexp_replace(v_phone, '\D', '', 'g'), 10)
            ) THEN
                v_phone := NULL;
            END IF;
        END IF;

        INSERT INTO public.user_profiles (
            id, phone, full_name, avatar_url, role, email,
            auth_provider, email_verified, email_verified_at, created_at
        ) VALUES (
            u.id,
            v_phone,
            v_name,
            v_avatar,
            'user',
            u.email,
            v_provider,
            CASE WHEN v_provider = 'google' THEN true ELSE false END,
            CASE WHEN v_provider = 'google' THEN u.created_at ELSE NULL END,
            u.created_at
        )
        ON CONFLICT (id) DO NOTHING;

        -- Ensure wallet exists
        INSERT INTO public.customer_wallets (user_id)
        VALUES (u.id)
        ON CONFLICT (user_id) DO NOTHING;
        
        v_count := v_count + 1;
    END LOOP;
    RAISE NOTICE 'Backfilled % missing user profiles', v_count;
END $$;
-- ── 4. Fix user_profiles_block_sensitive_column_updates() ──────────────────
-- Ensure it is SECURITY INVOKER and omits columns is_active and employee_number
-- which do not exist on user_profiles.
CREATE OR REPLACE FUNCTION public.user_profiles_block_sensitive_column_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
    IF current_setting('app.internal_bypass', true) = 'true'
       OR current_setting('role', true) IN ('service_role', 'supabase_admin')
       OR auth.jwt() ->> 'role' IN ('service_role', 'supabase_admin')
       OR session_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
        NEW.role                        := OLD.role;
        NEW.kyc_status                  := OLD.kyc_status;
        NEW.is_suspended                := OLD.is_suspended;
        NEW.suspension_reason           := OLD.suspension_reason;
        NEW.is_gold_verified            := OLD.is_gold_verified;
        NEW.subscription_expiry         := OLD.subscription_expiry;
        NEW.total_reward_points_earned  := OLD.total_reward_points_earned;
        NEW.reward_parent_id            := OLD.reward_parent_id;
        NEW.tree_depth                  := OLD.tree_depth;
        NEW.reward_tier                 := OLD.reward_tier;
        NEW.failed_login_attempts       := OLD.failed_login_attempts;
        NEW.locked_until                := OLD.locked_until;
        NEW.team_id                     := OLD.team_id;
        NEW.reporting_manager_id        := OLD.reporting_manager_id;
    END IF;

    RETURN NEW;
END;
$function$;
