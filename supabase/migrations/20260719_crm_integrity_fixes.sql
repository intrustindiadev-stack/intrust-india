-- ============================================================
-- CRM Integrity Fixes
-- Part A: sync_user_to_crm — phone deduplication for NULL-email accounts
-- Part B: pipeline_stage auto-sync trigger on crm_leads
-- Part C: crm_tasks RLS — lead-ownership scoped
-- Part D: crm_lead_services RLS — lead-ownership scoped
-- ============================================================

-- ============================================================
-- Part A: patch sync_user_to_crm to also deduplicate on phone
-- ============================================================

CREATE OR REPLACE FUNCTION sync_user_to_crm()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Try to find an admin to assign created_by
    SELECT id INTO admin_id FROM user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    IF admin_id IS NULL THEN
        admin_id := NEW.id; -- fallback
    END IF;

    -- Only sync customers
    IF NEW.role = 'customer' THEN
        -- Deduplicate on email (when email is not NULL) OR on phone (when phone is not NULL)
        IF NOT EXISTS (
            SELECT 1 FROM crm_leads
            WHERE
                (NEW.email IS NOT NULL AND email = NEW.email)
                OR
                (NEW.phone IS NOT NULL AND phone = NEW.phone)
        ) THEN
            INSERT INTO crm_leads (
                title,
                contact_name,
                phone,
                email,
                source,
                status,
                assigned_to,
                created_by
            ) VALUES (
                NEW.full_name || ' (User)',
                NEW.full_name,
                NEW.phone,
                NEW.email,
                'Users',
                'new',
                NULL,
                admin_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach trigger (DROP IF EXISTS to avoid duplicate)
DROP TRIGGER IF EXISTS sync_user_trigger ON user_profiles;
CREATE TRIGGER sync_user_trigger
AFTER INSERT ON user_profiles
FOR EACH ROW EXECUTE FUNCTION sync_user_to_crm();


-- ============================================================
-- Part B: pipeline_stage auto-sync trigger on crm_leads
-- Keeps pipeline_stage always equal to status::text
-- ============================================================

CREATE OR REPLACE FUNCTION sync_crm_pipeline_stage()
RETURNS TRIGGER AS $$
BEGIN
    NEW.pipeline_stage := NEW.status::text;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_pipeline_stage_trigger ON crm_leads;
CREATE TRIGGER sync_pipeline_stage_trigger
BEFORE INSERT OR UPDATE ON crm_leads
FOR EACH ROW EXECUTE FUNCTION sync_crm_pipeline_stage();

-- Backfill existing rows so pipeline_stage matches status
UPDATE public.crm_leads
SET pipeline_stage = status::text
WHERE pipeline_stage IS DISTINCT FROM status::text;


-- ============================================================
-- Part C: crm_tasks RLS — lead-ownership scoped
-- ============================================================

-- Drop the overly-permissive policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.crm_tasks;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.crm_tasks;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.crm_tasks;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.crm_tasks;

-- SELECT: own tasks OR manager/admin
CREATE POLICY "crm_tasks_select"
ON public.crm_tasks FOR SELECT
TO authenticated
USING (
    assigned_to = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.crm_leads l
        WHERE l.id = lead_id
          AND (
              l.assigned_to = auth.uid()
              OR l.created_by = auth.uid()
              OR (SELECT role FROM public.user_profiles WHERE id = auth.uid())
                 IN ('sales_manager', 'admin', 'super_admin')
          )
    )
    OR
    (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    IN ('sales_manager', 'admin', 'super_admin')
);

-- INSERT: must be assigning to own lead or be manager/admin
CREATE POLICY "crm_tasks_insert"
ON public.crm_tasks FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.crm_leads l
        WHERE l.id = lead_id
          AND (
              l.assigned_to = auth.uid()
              OR l.created_by = auth.uid()
              OR (SELECT role FROM public.user_profiles WHERE id = auth.uid())
                 IN ('sales_manager', 'admin', 'super_admin')
          )
    )
);

-- UPDATE: task assignee OR lead owner OR manager/admin
CREATE POLICY "crm_tasks_update"
ON public.crm_tasks FOR UPDATE
TO authenticated
USING (
    assigned_to = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.crm_leads l
        WHERE l.id = lead_id
          AND (
              l.assigned_to = auth.uid()
              OR l.created_by = auth.uid()
              OR (SELECT role FROM public.user_profiles WHERE id = auth.uid())
                 IN ('sales_manager', 'admin', 'super_admin')
          )
    )
);

-- DELETE: managers and admins only
CREATE POLICY "crm_tasks_delete"
ON public.crm_tasks FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    IN ('sales_manager', 'admin', 'super_admin')
);


-- ============================================================
-- Part D: crm_lead_services RLS — lead-ownership scoped
-- (mirrors crm_tasks above)
-- ============================================================

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.crm_lead_services;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.crm_lead_services;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.crm_lead_services;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.crm_lead_services;

CREATE POLICY "crm_lead_services_select"
ON public.crm_lead_services FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.crm_leads l
        WHERE l.id = lead_id
          AND (
              l.assigned_to = auth.uid()
              OR l.created_by = auth.uid()
              OR (SELECT role FROM public.user_profiles WHERE id = auth.uid())
                 IN ('sales_manager', 'admin', 'super_admin')
          )
    )
);

CREATE POLICY "crm_lead_services_insert"
ON public.crm_lead_services FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.crm_leads l
        WHERE l.id = lead_id
          AND (
              l.assigned_to = auth.uid()
              OR l.created_by = auth.uid()
              OR (SELECT role FROM public.user_profiles WHERE id = auth.uid())
                 IN ('sales_manager', 'admin', 'super_admin')
          )
    )
);

CREATE POLICY "crm_lead_services_update"
ON public.crm_lead_services FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.crm_leads l
        WHERE l.id = lead_id
          AND (
              l.assigned_to = auth.uid()
              OR l.created_by = auth.uid()
              OR (SELECT role FROM public.user_profiles WHERE id = auth.uid())
                 IN ('sales_manager', 'admin', 'super_admin')
          )
    )
);

CREATE POLICY "crm_lead_services_delete"
ON public.crm_lead_services FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    IN ('sales_manager', 'admin', 'super_admin')
);
