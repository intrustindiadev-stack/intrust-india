-- Add foreign key constraint to link merchant_ratings.customer_id securely to user_profiles.id
-- This allows postgREST queries from the frontend to seamlessly JOIN user_profiles:customer_id 
-- without explicitly defining a view.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'merchant_ratings_customer_id_profile_fkey' 
        AND table_name = 'merchant_ratings'
    ) THEN
        ALTER TABLE merchant_ratings 
        ADD CONSTRAINT merchant_ratings_customer_id_profile_fkey 
        FOREIGN KEY (customer_id) 
        REFERENCES user_profiles(id);
    END IF;
END $$;
