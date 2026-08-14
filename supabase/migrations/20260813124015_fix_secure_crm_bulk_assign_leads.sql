CREATE OR REPLACE FUNCTION public.crm_bulk_assign_leads(p_lead_ids uuid[], p_new_rep_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_caller_id     UUID;
    v_caller_role   TEXT;
    v_rep_role      TEXT;
    v_target_team_id UUID;
    v_affected_rows INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Validate caller role
    SELECT role::text INTO v_caller_role
    FROM public.user_profiles WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'super_admin', 'relationship_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin or Relationship Manager access required');
    END IF;

    -- Validate target representative if provided
    IF p_new_rep_id IS NOT NULL THEN
        SELECT role::text INTO v_rep_role
        FROM public.user_profiles WHERE id = p_new_rep_id;

        IF v_rep_role IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Target representative not found');
        END IF;

        IF v_rep_role NOT IN ('relationship_exec', 'relationship_manager', 'admin', 'super_admin') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Target user is not a relationship representative');
        END IF;

        -- Enforce team scope authorization for Relationship Managers
        IF v_caller_role = 'relationship_manager' AND p_new_rep_id != v_caller_id THEN
            SELECT team_id INTO v_target_team_id FROM public.user_profiles WHERE id = p_new_rep_id;
            
            IF v_target_team_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Target representative does not belong to any team');
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM team_get_user_subtree(v_caller_id) WHERE id = v_target_team_id
            ) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Target representative is outside your team scope');
            END IF;
        END IF;
    END IF;

    -- Protect against excessively large arrays
    IF array_length(p_lead_ids, 1) > 5000 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot assign more than 5000 leads at once');
    END IF;

    IF p_lead_ids IS NULL OR array_length(p_lead_ids, 1) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No leads provided');
    END IF;

    -- Perform bulk update (only for non-archived leads)
    UPDATE public.crm_leads
    SET assigned_to = p_new_rep_id,
        updated_at  = NOW()
    WHERE id = ANY(p_lead_ids)
      AND archived_at IS NULL
      AND (assigned_to IS DISTINCT FROM p_new_rep_id);

    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    -- Audit the bulk operation in a single event for efficiency
    INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, new_data)
    VALUES (
        v_caller_id,
        'BULK_ASSIGNMENT',
        'crm_leads',
        NULL, -- It's a bulk operation
        jsonb_build_object(
            'new_rep_id', p_new_rep_id,
            'affected_count', v_affected_rows,
            'lead_ids', p_lead_ids
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'affected_count', v_affected_rows,
        'message', 'Successfully assigned ' || v_affected_rows || ' leads'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Database error occurred: ' || SQLERRM);
END;
$function$;
