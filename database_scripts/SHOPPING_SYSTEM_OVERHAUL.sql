-- ================================================
-- SHOPPING SYSTEM OVERHAUL: SCHEMA, RLS, AND RPCS
-- ================================================

-- 1. ADJUST shopping_products TABLE
-- Remove merchant_owner_id as it's no longer needed for global/platform products
ALTER TABLE public.shopping_products DROP COLUMN IF EXISTS merchant_owner_id;

-- 2. CREATE shopping_orders TABLE [NEW]
-- This table logs all purchases (Wholesale & Retail) for analytics and history
CREATE TABLE IF NOT EXISTS public.shopping_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL, -- references auth.users (customer) or merchants(id)
    buyer_type TEXT NOT NULL CHECK (buyer_type IN ('customer', 'merchant')),
    seller_id UUID, -- NULL for admin, merchant_id for merchants
    seller_type TEXT NOT NULL CHECK (seller_type IN ('admin', 'merchant')),
    product_id UUID NOT NULL REFERENCES public.shopping_products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_paise BIGINT NOT NULL,
    total_price_paise BIGINT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('wholesale', 'retail')),
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure total_price_paise exists (in case table already existed from previous runs)
ALTER TABLE public.shopping_orders ADD COLUMN IF NOT EXISTS total_price_paise BIGINT;

-- 3. ENABLE RLS ON ALL SHOPPING TABLES
ALTER TABLE public.shopping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_orders ENABLE ROW LEVEL SECURITY;

-- Extra: Grant access to authenticated users
GRANT ALL ON public.merchant_inventory TO authenticated;
GRANT ALL ON public.shopping_orders TO authenticated;
GRANT ALL ON public.shopping_products TO authenticated;
GRANT ALL ON public.shopping_categories TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. RLS POLICIES FOR shopping_categories
DROP POLICY IF EXISTS "Public can view active categories" ON public.shopping_categories;
CREATE POLICY "Public can view active categories" ON public.shopping_categories
    FOR SELECT USING (is_active = true);

-- 5. RLS POLICIES FOR shopping_products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.shopping_products;
CREATE POLICY "Anyone can view active products" ON public.shopping_products
    FOR SELECT USING (is_active = true);

-- 6. RLS POLICIES FOR merchant_inventory
-- Advanced: Drop ALL existing policies to ensure a clean slate
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'merchant_inventory' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.merchant_inventory', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Anyone can view active inventory" ON public.merchant_inventory
    FOR SELECT USING (is_active = true AND stock_quantity > 0);

CREATE POLICY "Merchants manage own inventory" ON public.merchant_inventory
    FOR ALL TO authenticated
    USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

-- 7. RLS POLICIES FOR shopping_orders
DROP POLICY IF EXISTS "Users can view own purchase history" ON public.shopping_orders;
CREATE POLICY "Users can view own purchase history" ON public.shopping_orders
    FOR SELECT TO authenticated
    USING (
        (buyer_type = 'customer' AND buyer_id = auth.uid()) OR
        (buyer_type = 'merchant' AND buyer_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())) OR
        (seller_type = 'merchant' AND seller_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()))
    );

-- 8. RPC: Purchase Platform Products (Wholesale)
-- Handles Merchant buying from Admin
CREATE OR REPLACE FUNCTION public.purchase_platform_products(
    p_product_id UUID,
    p_quantity INTEGER,
    p_merchant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wholesale_price BIGINT;
    v_total_cost BIGINT;
    v_merchant_balance BIGINT;
    v_admin_stock INTEGER;
BEGIN
    -- 1. Get product details
    SELECT wholesale_price_paise, admin_stock INTO v_wholesale_price, v_admin_stock
    FROM public.shopping_products WHERE id = p_product_id FOR UPDATE;

    IF v_admin_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient admin stock');
    END IF;

    v_total_cost := v_wholesale_price * p_quantity;

    -- 2. Check merchant balance
    SELECT wallet_balance_paise INTO v_merchant_balance
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    -- 3. Deduct balance and admin stock
    UPDATE public.merchants SET wallet_balance_paise = wallet_balance_paise - v_total_cost WHERE id = p_merchant_id;
    UPDATE public.shopping_products SET admin_stock = admin_stock - p_quantity WHERE id = p_product_id;

    -- 4. Add to merchant inventory
    INSERT INTO public.merchant_inventory (
        merchant_id, 
        product_id, 
        stock_quantity, 
        retail_price_paise, 
        is_platform_product, 
        is_active,
        custom_title,
        custom_description
    )
    SELECT 
        p_merchant_id, 
        p_product_id, 
        p_quantity, 
        0, 
        true, 
        true,
        title,
        description
    FROM public.shopping_products WHERE id = p_product_id
    ON CONFLICT (merchant_id, product_id) DO UPDATE
    SET stock_quantity = merchant_inventory.stock_quantity + p_quantity,
        is_active = true;

    -- 5. Log Order
    INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
    VALUES (p_merchant_id, 'merchant', NULL, 'admin', p_product_id, p_quantity, v_wholesale_price, v_total_cost, 'wholesale');

    -- 6. Log Merchant Transaction
    INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, description, metadata)
    VALUES (p_merchant_id, 'purchase', -v_total_cost, 'Wholesale purchase of products', jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity));

    RETURN jsonb_build_object('success', true, 'message', 'Purchase successful');
END;
$$;

-- 9. RPC: Customer Purchase From Merchant (Retail)
CREATE OR REPLACE FUNCTION public.customer_purchase_from_merchant(
    p_inventory_id UUID,
    p_quantity INTEGER,
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inventory RECORD;
    v_total_cost BIGINT;
    v_customer_balance BIGINT;
BEGIN
    -- 1. Get inventory details
    SELECT * INTO v_inventory FROM public.merchant_inventory WHERE id = p_inventory_id FOR UPDATE;

    IF v_inventory.stock_quantity < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant stock');
    END IF;

    v_total_cost := v_inventory.retail_price_paise * p_quantity;

    -- 2. Check customer balance
    SELECT wallet_balance_paise INTO v_customer_balance
    FROM public.user_profiles WHERE id = p_customer_id FOR UPDATE;

    IF v_customer_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    -- 3. Update balances and stock
    UPDATE public.user_profiles SET wallet_balance_paise = wallet_balance_paise - v_total_cost WHERE id = p_customer_id;
    UPDATE public.merchants SET wallet_balance_paise = wallet_balance_paise + v_total_cost WHERE id = v_inventory.merchant_id;
    UPDATE public.merchant_inventory SET stock_quantity = stock_quantity - p_quantity WHERE id = p_inventory_id;

    -- 4. Log Order
    INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
    VALUES (p_customer_id, 'customer', v_inventory.merchant_id, 'merchant', v_inventory.product_id, p_quantity, v_inventory.retail_price_paise, v_total_cost, 'retail');

    -- 5. Log Merchant Transaction (Earnings)
    INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, description, metadata)
    VALUES (v_inventory.merchant_id, 'sale_earnings', v_total_cost, 'Product sale to customer', jsonb_build_object('buyer_id', p_customer_id, 'product_id', v_inventory.product_id));

    RETURN jsonb_build_object('success', true, 'message', 'Order placed successfully');
END;
$$;

-- 10. RPC: Customer Purchase From Platform (Direct Admin Sale)
CREATE OR REPLACE FUNCTION public.customer_purchase_from_platform(
    p_product_id UUID,
    p_quantity INTEGER,
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_total_cost BIGINT;
    v_customer_balance BIGINT;
BEGIN
    -- 1. Get product details
    SELECT * INTO v_product FROM public.shopping_products WHERE id = p_product_id FOR UPDATE;

    IF v_product.admin_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient platform stock');
    END IF;

    -- Using suggested_retail_price_paise for direct sales
    v_total_cost := v_product.suggested_retail_price_paise * p_quantity;

    -- 2. Check customer balance
    SELECT wallet_balance_paise INTO v_customer_balance
    FROM public.user_profiles WHERE id = p_customer_id FOR UPDATE;

    IF v_customer_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    -- 3. Update balances and stock
    UPDATE public.user_profiles SET wallet_balance_paise = wallet_balance_paise - v_total_cost WHERE id = p_customer_id;
    UPDATE public.shopping_products SET admin_stock = admin_stock - p_quantity WHERE id = p_product_id;

    -- 4. Log Order
    INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
    VALUES (p_customer_id, 'customer', NULL, 'admin', p_product_id, p_quantity, v_product.suggested_retail_price_paise, v_total_cost, 'retail');

    RETURN jsonb_build_object('success', true, 'message', 'Order placed successfully');
END;
$$;

-- 11. RPC: Customer Bulk Purchase V2 (Handles both Merchant & Platform)
CREATE OR REPLACE FUNCTION public.customer_bulk_purchase_v2(
    p_items JSONB[], -- Array of {inventory_id: UUID, product_id: UUID, quantity: INT, is_platform: BOOL}
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_inventory RECORD;
    v_product RECORD;
    v_total_cost BIGINT := 0;
    v_customer_balance BIGINT;
    v_item_cost BIGINT;
BEGIN
    -- 1. Check customer balance first
    SELECT wallet_balance_paise INTO v_customer_balance
    FROM public.user_profiles WHERE id = p_customer_id FOR UPDATE;

    -- 2. Calculate total cost and validate stock for all items
    FOREACH v_item IN ARRAY p_items LOOP
        IF (v_item->>'is_platform')::BOOLEAN THEN
            SELECT * INTO v_product FROM public.shopping_products WHERE id = (v_item->>'product_id')::UUID;
            IF v_product.admin_stock < (v_item->>'quantity')::INTEGER THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient platform stock for ' || v_product.title);
            END IF;
            v_total_cost := v_total_cost + (v_product.suggested_retail_price_paise * (v_item->>'quantity')::INTEGER);
        ELSE
            SELECT * INTO v_inventory FROM public.merchant_inventory WHERE id = (v_item->>'inventory_id')::UUID;
            IF v_inventory.stock_quantity < (v_item->>'quantity')::INTEGER THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant stock');
            END IF;
            v_total_cost := v_total_cost + (v_inventory.retail_price_paise * (v_item->>'quantity')::INTEGER);
        END IF;
    END LOOP;

    IF v_customer_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    -- 3. Process each item (Update stock, Log order, Log transaction)
    FOREACH v_item IN ARRAY p_items LOOP
        IF (v_item->>'is_platform')::BOOLEAN THEN
            SELECT * INTO v_product FROM public.shopping_products WHERE id = (v_item->>'product_id')::UUID FOR UPDATE;
            v_item_cost := v_product.suggested_retail_price_paise * (v_item->>'quantity')::INTEGER;
            
            UPDATE public.shopping_products SET admin_stock = admin_stock - (v_item->>'quantity')::INTEGER WHERE id = v_product.id;
            
            INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
            VALUES (p_customer_id, 'customer', NULL, 'admin', v_product.id, (v_item->>'quantity')::INTEGER, v_product.suggested_retail_price_paise, v_item_cost, 'retail');
        ELSE
            SELECT * INTO v_inventory FROM public.merchant_inventory WHERE id = (v_item->>'inventory_id')::UUID FOR UPDATE;
            v_item_cost := v_inventory.retail_price_paise * (v_item->>'quantity')::INTEGER;
            
            UPDATE public.merchant_inventory SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER WHERE id = v_inventory.id;
            UPDATE public.merchants SET wallet_balance_paise = wallet_balance_paise + v_item_cost WHERE id = v_inventory.merchant_id;
            
            INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
            VALUES (p_customer_id, 'customer', v_inventory.merchant_id, 'merchant', v_inventory.product_id, (v_item->>'quantity')::INTEGER, v_inventory.retail_price_paise, v_item_cost, 'retail');
            
            INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, description, metadata)
            VALUES (v_inventory.merchant_id, 'sale_earnings', v_item_cost, 'Product sale to customer', jsonb_build_object('buyer_id', p_customer_id, 'product_id', v_inventory.product_id));
        END IF;
    END LOOP;

    -- 4. Final Balance Update
    UPDATE public.user_profiles SET wallet_balance_paise = wallet_balance_paise - v_total_cost WHERE id = p_customer_id;

    RETURN jsonb_build_object('success', true, 'message', 'All orders placed successfully');
END;
$$;
