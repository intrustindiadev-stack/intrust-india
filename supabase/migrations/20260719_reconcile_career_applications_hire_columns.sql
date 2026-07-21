-- ============================================================
-- Reconcile career_applications: add hire-workflow columns
-- written by the /api/hrm/hire-candidate route but never
-- defined in the base 20260425_career_schema_and_rls.sql
-- ============================================================

ALTER TABLE public.career_applications
  ADD COLUMN IF NOT EXISTS hired_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offered_salary   NUMERIC,
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS joining_bonus    NUMERIC,
  ADD COLUMN IF NOT EXISTS offer_letter_notes TEXT,
  ADD COLUMN IF NOT EXISTS interview_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interview_notes  TEXT;
