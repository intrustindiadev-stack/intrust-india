-- Allow authenticated admins and crm users to manage invoices
CREATE POLICY "Allow CRM/Admin manage invoices"
    ON public.invoices
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM user_profiles
            WHERE role IN ('admin', 'super_admin', 'sales_exec', 'sales_manager', 'relationship_exec', 'relationship_manager')
        )
    );
