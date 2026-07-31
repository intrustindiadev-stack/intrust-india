DO $$
BEGIN
    DROP POLICY IF EXISTS "employee_update_own_attendance" ON public.attendance;
END $$;

CREATE POLICY "employee_update_own_attendance"
    ON public.attendance FOR UPDATE
    USING (employee_id = auth.uid());
