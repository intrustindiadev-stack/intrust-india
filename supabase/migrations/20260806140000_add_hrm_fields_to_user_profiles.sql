-- ============================================================
-- Add Missing HRM Fields to user_profiles
-- Migration Date: 2026-08-06
--
-- Problem: The HRM Employees page (/app/(hrm)/hrm/employees/page.jsx)
-- attempts to save employee-specific fields (employee_id, joining_date,
-- employment_type, base_salary, city, department) to user_profiles,
-- but these columns do not exist. This causes silent save failures.
--
-- Resolution: Add these HRM columns to user_profiles so the existing
-- HR page works immediately. The `employees` table will remain for
-- more detailed HRM records (payslips, leave balances, etc.).
-- ============================================================

-- 1. Add employee_id (HR-assigned code like EMP001)
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- 2. Add joining_date
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS joining_date DATE;

-- 3. Add employment_type (full_time, part_time, contract, intern)
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS employment_type TEXT 
    CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern') OR employment_type IS NULL);

-- 4. Add base_salary (in rupees per month)
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS base_salary NUMERIC(12, 2) DEFAULT 0.00;

-- 5. Add city (employee's working city — separate from address)
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS city TEXT;

-- 6. Add department
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS department TEXT;

-- 7. Add unique constraint on employee_id (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_employee_id_unique
    ON public.user_profiles(employee_id)
    WHERE employee_id IS NOT NULL;

-- 8. Performance index for HR queries by department
CREATE INDEX IF NOT EXISTS idx_user_profiles_department 
    ON public.user_profiles(department) 
    WHERE department IS NOT NULL;

-- 9. Update RLS policies to include new HRM fields
-- The existing policies already cover SELECT/UPDATE on user_profiles
-- HR managers can update HRM fields for employees

-- Verify: confirm columns were added
DO $$
DECLARE
    v_cols TEXT[];
    v_required TEXT[] := ARRAY['employee_id', 'joining_date', 'employment_type', 'base_salary', 'city', 'department'];
    v_col TEXT;
BEGIN
    SELECT ARRAY_AGG(column_name::TEXT) INTO v_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
    AND column_name = ANY(v_required);
    
    FOREACH v_col IN ARRAY v_required LOOP
        IF NOT (v_col = ANY(v_cols)) THEN
            RAISE EXCEPTION 'Column % was not added to user_profiles', v_col;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'All HRM columns successfully added to user_profiles. ✓';
END;
$$;
