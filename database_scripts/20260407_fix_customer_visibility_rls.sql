-- Allow merchants to see basic info of customers who interacted with them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'view_customer_profiles_for_merchants'
    ) THEN
        CREATE POLICY "view_customer_profiles_for_merchants" ON public.user_profiles
        FOR SELECT
        USING (
          EXISTS (
            -- Case 1: Customer has rated the merchant
            SELECT 1 FROM public.merchant_ratings mr
            JOIN public.merchants m ON mr.merchant_id = m.id
            WHERE mr.customer_id = public.user_profiles.id
            AND m.user_id = auth.uid()
          )
          OR
          EXISTS (
            -- Case 2: Customer has placed an order with the merchant
            SELECT 1 FROM public.shopping_order_groups sog
            JOIN public.merchants m ON sog.merchant_id = m.id
            WHERE sog.customer_id = public.user_profiles.id
            AND m.user_id = auth.uid()
          )
        );
    END IF;
END $$;
