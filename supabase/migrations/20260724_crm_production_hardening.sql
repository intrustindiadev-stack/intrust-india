-- ============================================================
-- CRM Production Hardening Migration
-- 1.1 Add archived_at timestamp for soft-deletes
-- 1.2 Create audit_logs_crm table
-- 1.3 Create audit trigger for crm_leads
-- 1.4 B-Tree performance indexes for CRM tables
-- 1.5 Update RLS policies for crm_leads (DELETE policy + soft-delete filter)
-- ============================================================

-- 1.1 Soft-delete column
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- 1.2 Audit logs table for CRM
CREATE TABLE IF NOT EXISTS public.audit_logs_crm (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs_crm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_read_audit_logs_crm" ON public.audit_logs_crm;
CREATE POLICY "crm_read_audit_logs_crm" ON public.audit_logs_crm
    FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_manager', 'admin', 'super_admin')
    );

DROP POLICY IF EXISTS "crm_insert_audit_logs_crm" ON public.audit_logs_crm;
CREATE POLICY "crm_insert_audit_logs_crm" ON public.audit_logs_crm
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 1.3 Audit trigger function
CREATE OR REPLACE FUNCTION audit_crm_leads_changes()
RETURNS TRIGGER AS $$
DECLARE
    actor_id_val UUID;
BEGIN
    actor_id_val := auth.uid();

    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
        VALUES (
            actor_id_val,
            'UPDATE',
            'crm_leads',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
        VALUES (
            actor_id_val,
            'INSERT',
            'crm_leads',
            NEW.id,
            NULL,
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
        VALUES (
            actor_id_val,
            'DELETE',
            'crm_leads',
            OLD.id,
            to_jsonb(OLD),
            NULL
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_crm_leads ON public.crm_leads;
CREATE TRIGGER trg_audit_crm_leads
    AFTER INSERT OR UPDATE OR DELETE ON public.crm_leads
    FOR EACH ROW EXECUTE FUNCTION audit_crm_leads_changes();

-- 1.4 Performance Indexes
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_to ON public.crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON public.crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_by ON public.crm_leads(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON public.crm_leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_phone ON public.crm_leads(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_archived_at ON public.crm_leads(archived_at) WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead_id ON public.crm_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON public.crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status_due_date ON public.crm_tasks(status, due_date);

CREATE INDEX IF NOT EXISTS idx_crm_lead_notes_lead_id ON public.crm_lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_lead_id ON public.crm_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_services_lead_id ON public.crm_lead_services(lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_crm_created_at ON public.audit_logs_crm(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_crm_record_id ON public.audit_logs_crm(record_id);

-- 1.5 RLS Policies Update
DROP POLICY IF EXISTS "Sales can view their own leads, Managers/Admins can view all" ON public.crm_leads;
CREATE POLICY "Sales can view their own leads, Managers/Admins can view all"
    ON public.crm_leads FOR SELECT
    USING (
        (archived_at IS NULL OR (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_manager', 'admin', 'super_admin'))
        AND (
            auth.uid() = assigned_to OR 
            auth.uid() = created_by OR
            (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_manager', 'admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Managers/Admins can delete leads" ON public.crm_leads;
CREATE POLICY "Managers/Admins can delete leads"
    ON public.crm_leads FOR DELETE
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_manager', 'admin', 'super_admin')
    );
