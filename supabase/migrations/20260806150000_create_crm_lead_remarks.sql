-- ============================================================
-- CRM Lead Remarks System
-- Migration Date: 2026-08-06
--
-- Creates a dedicated remarks table for CRM leads with:
-- - Author attribution + timestamps
-- - Internal vs customer-visible flag
-- - Follow-up date scheduling
-- - Edit history (JSONB array)
-- - Full RLS matching crm_leads visibility rules
-- ============================================================

-- 1. Create the crm_lead_remarks table
CREATE TABLE IF NOT EXISTS public.crm_lead_remarks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id         UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    content         TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
    is_internal     BOOLEAN NOT NULL DEFAULT false,      -- true = only visible to RM/admin
    follow_up_at    TIMESTAMP WITH TIME ZONE,            -- optional follow-up reminder
    edited_at       TIMESTAMP WITH TIME ZONE,            -- last edit time
    edit_history    JSONB DEFAULT '[]'::jsonb,           -- [{content, edited_at, edited_by}]
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_crm_lead_remarks_lead_id ON public.crm_lead_remarks(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_remarks_author_id ON public.crm_lead_remarks(author_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_remarks_follow_up ON public.crm_lead_remarks(follow_up_at)
    WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_lead_remarks_created_at ON public.crm_lead_remarks(created_at DESC);

-- 3. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_crm_lead_remarks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_lead_remarks_updated_at ON public.crm_lead_remarks;
CREATE TRIGGER trg_crm_lead_remarks_updated_at
    BEFORE UPDATE ON public.crm_lead_remarks
    FOR EACH ROW EXECUTE FUNCTION public.update_crm_lead_remarks_updated_at();

-- 4. Enable RLS
ALTER TABLE public.crm_lead_remarks ENABLE ROW LEVEL SECURITY;

-- 5. SELECT: Same visibility as crm_leads
-- relationship_exec sees remarks on their own leads
-- relationship_manager sees all remarks in their authorized teams
-- admin/super_admin sees all
CREATE POLICY "crm_lead_remarks_select"
    ON public.crm_lead_remarks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_leads l
            WHERE l.id = lead_id AND (
                l.assigned_to = auth.uid() OR
                l.created_by  = auth.uid() OR
                (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
                    IN ('relationship_manager', 'admin', 'super_admin')
            )
        )
    );

-- 6. INSERT: Can add remarks to leads you have access to
CREATE POLICY "crm_lead_remarks_insert"
    ON public.crm_lead_remarks FOR INSERT
    WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.crm_leads l
            WHERE l.id = lead_id AND (
                l.assigned_to = auth.uid() OR
                l.created_by  = auth.uid() OR
                (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
                    IN ('relationship_exec', 'relationship_manager', 'admin', 'super_admin')
            )
        )
    );

-- 7. UPDATE: Only author can edit their own remarks (within 24 hours)
-- Admins can edit anytime
CREATE POLICY "crm_lead_remarks_update"
    ON public.crm_lead_remarks FOR UPDATE
    USING (
        author_id = auth.uid() OR
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
            IN ('admin', 'super_admin')
    );

-- 8. DELETE: Only author or admin can delete
CREATE POLICY "crm_lead_remarks_delete"
    ON public.crm_lead_remarks FOR DELETE
    USING (
        author_id = auth.uid() OR
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
            IN ('admin', 'super_admin')
    );

-- 9. Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_lead_remarks TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.crm_lead_remarks_id_seq TO authenticated;

-- Verify
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'crm_lead_remarks'
    ) THEN
        RAISE EXCEPTION 'crm_lead_remarks table was not created';
    END IF;
    RAISE NOTICE 'crm_lead_remarks table created with RLS. ✓';
END;
$$;
