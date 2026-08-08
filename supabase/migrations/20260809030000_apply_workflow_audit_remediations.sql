-- 20260809030000_apply_workflow_audit_remediations.sql

-- ==========================================
-- ISSUE 1: External Lead Sources
-- ==========================================

-- Unique index to enforce idempotency for external sources
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_source_external_idx 
ON public.crm_leads (source_system, external_lead_id) 
WHERE source_system IS NOT NULL AND external_lead_id IS NOT NULL;

-- 1. Solar Leads Trigger
CREATE OR REPLACE FUNCTION public.trg_route_solar_to_crm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.crm_leads 
        WHERE source_system = 'solar' AND external_lead_id = NEW.id::text
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
            notes, 
            pipeline_stage,
            created_by,
            city,
            pincode
        ) VALUES (
            'Solar Request: ' || NEW.name,
            NEW.name,
            NEW.mobile,
            NEW.email,
            'solar',
            'solar',
            NEW.id::text,
            'new',
            'Monthly Bill: ' || COALESCE(NEW.monthly_bill_range, 'N/A'),
            'new',
            NEW.user_id,
            NEW.city,
            NEW.pincode
        );
    END IF;
    RETURN NEW;
END;
$function$;

-- 2. Merchant Leads Trigger
CREATE OR REPLACE FUNCTION public.sync_merchant_to_crm()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
    user_email TEXT;
    user_city TEXT;
    user_state TEXT;
BEGIN
    SELECT id INTO admin_id FROM public.user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    IF admin_id IS NULL THEN
        admin_id := NEW.user_id; 
    END IF;

    SELECT email, city, state INTO user_email, user_city, user_state 
    FROM public.user_profiles WHERE id = NEW.user_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.crm_leads 
        WHERE source_system = 'merchant_app' AND external_lead_id = NEW.id::text
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
            NEW.business_name || ' (Merchant)',
            NEW.business_name,
            NEW.business_phone,
            user_email,
            'Merchants',
            'merchant_app',
            NEW.id::text,
            'new',
            NULL,
            admin_id,
            user_city,
            user_state
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. User Leads Trigger
CREATE OR REPLACE FUNCTION public.sync_user_to_crm()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM public.user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    IF admin_id IS NULL THEN
        admin_id := NEW.id;
    END IF;

    IF NEW.role = 'customer' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.crm_leads 
            WHERE source_system = 'users' AND external_lead_id = NEW.id::text
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
                NEW.full_name || ' (User)',
                NEW.full_name,
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

-- ==========================================
-- ISSUE 2: Routing Engine Reroute Pending
-- ==========================================
CREATE OR REPLACE FUNCTION public.crm_route_lead_territory()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_match RECORD;
    v_rep_id UUID;
    v_team_changed BOOLEAN;
BEGIN
    -- manual_override explicitly bypasses automatic routing
    IF (TG_OP = 'UPDATE' AND NEW.routing_status = 'manual_override') THEN
        RETURN NEW;
    END IF;

    -- If it's already auto_matched, only re-route if location changed
    IF TG_OP = 'UPDATE' AND NEW.routing_status = 'auto_matched' THEN
        IF NOT (
            NEW.pincode IS DISTINCT FROM OLD.pincode OR
            NEW.zone IS DISTINCT FROM OLD.zone OR
            NEW.area IS DISTINCT FROM OLD.area OR
            NEW.city IS DISTINCT FROM OLD.city OR
            NEW.state IS DISTINCT FROM OLD.state
        ) THEN
            RETURN NEW; 
        END IF;
    END IF;

    v_match := public.crm_match_team_for_location(NEW.pincode, NEW.zone, NEW.area, NEW.city, NEW.state);

    IF v_match.out_team_id IS NOT NULL THEN
        -- Check if team has changed BEFORE updating NEW
        v_team_changed := (TG_OP = 'UPDATE' AND v_match.out_team_id IS DISTINCT FROM OLD.assigned_team_id) OR (TG_OP = 'INSERT');

        NEW.assigned_team_id     := v_match.out_team_id;
        NEW.territory_match_type := v_match.out_match_type;
        NEW.routing_status       := 'auto_matched';
        NEW.routed_at            := now();

        -- Assign rep if we are changing teams or if it's currently in team-pool (NULL)
        IF (NEW.assigned_to IS NULL OR v_team_changed) THEN
            v_rep_id := public.crm_pick_team_rep(v_match.out_team_id);
            NEW.assigned_to := v_rep_id;
        END IF;
    ELSE
        NEW.assigned_team_id     := NULL;
        NEW.territory_match_type := NULL;
        NEW.routing_status       := 'unmatched';
        NEW.routed_at            := NULL;
        NEW.assigned_to          := NULL;
    END IF;

    RETURN NEW;
END;
$$;


-- ==========================================
-- ISSUE 4: Employee Transfer Filtering
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_sync_leads_on_team_transfer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.team_id IS DISTINCT FROM OLD.team_id) THEN
        UPDATE public.crm_leads 
        SET assigned_team_id = NEW.team_id 
        WHERE assigned_to = NEW.id 
          AND status NOT IN ('won', 'lost')
          AND archived_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;
