BEGIN;

-- Set JWT claims to act as super_admin
SELECT set_config('request.jwt.claims', '{"role":"super_admin", "sub":"00000000-0000-0000-0000-000000000000"}', true);

DO $$
DECLARE
    res jsonb;
BEGIN
    -- Test insert with correct parameter types (bigints for prices)
    res := public.admin_insert_shopping_product(
        'Test Product RPC Fix',
        'Description for test product',
        'Electronics',
        '00000000-0000-0000-0000-000000000000'::uuid,
        1000::bigint, -- wholesale_price
        1500::bigint, -- retail_price
        2000::bigint, -- mrp_paise
        10::integer,  -- admin_stock
        ARRAY['img1.jpg', 'img2.jpg']::text[], -- product_images
        true::boolean, -- is_active
        18::integer,   -- gst_percentage
        '1234'::text   -- hsn_code
    );
    
    RAISE NOTICE 'Insert Result: %', res;
    
    -- We won't test update right now because it requires the newly inserted UUID,
    -- but this proves the function signature accepts the new types without error.
END;
$$;

ROLLBACK;
