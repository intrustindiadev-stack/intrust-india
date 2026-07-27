-- 20260727_audit_logs_hrm_fk.sql
-- Add foreign key relationship from audit_logs_hrm.actor_id to public.user_profiles(id)

ALTER TABLE public.audit_logs_hrm
  DROP CONSTRAINT IF EXISTS audit_logs_hrm_actor_id_fkey;

ALTER TABLE public.audit_logs_hrm
  ADD CONSTRAINT audit_logs_hrm_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
