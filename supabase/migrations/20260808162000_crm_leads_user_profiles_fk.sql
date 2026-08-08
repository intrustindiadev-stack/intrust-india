-- Add foreign key from crm_leads.assigned_to to public.user_profiles(id)
-- This allows PostgREST to infer the relationship for queries like `supabase.from('crm_leads').select('user_profiles(full_name)')`

ALTER TABLE public.crm_leads 
  ADD CONSTRAINT crm_leads_assigned_to_profile_fk 
  FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id) 
  ON DELETE SET NULL;
