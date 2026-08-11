CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 DECLARE
     v_admin_id UUID;
     v_admin_role user_role;
 BEGIN
     v_admin_id := auth.uid();
     
     -- Check admin role
     SELECT role INTO v_admin_role
     FROM public.user_profiles
     WHERE id = v_admin_id;
     
     IF v_admin_role NOT IN ('admin', 'super_admin') THEN
         RAISE EXCEPTION 'Only admins can unsuspend users';
     END IF;
     
     -- Unsuspend user
     UPDATE public.user_profiles
     SET 
         is_suspended = FALSE,
         suspension_reason = NULL,
         updated_at = NOW()
     WHERE id = p_user_id;
     
     -- Log the action
     INSERT INTO public.audit_logs (
         actor_id, actor_role, action, entity_type, entity_id,
         description, metadata
     ) VALUES (
         v_admin_id, v_admin_role, 'user_reactivated', 'user', p_user_id,
         'User unsuspended',
         jsonb_build_object()
     );
     
     RETURN jsonb_build_object('success', true);
 END;
$function$;
