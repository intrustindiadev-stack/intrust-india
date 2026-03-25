-- ================================================
-- INCREMENTAL UPDATE: MERCHANT SHOPPING RPCS V2
-- ================================================
-- Applies zero-price fixes to purchase_platform_products and
-- adds positive quantity guards to all shopping RPCs.

-- 0. Cleanup: Remove ambiguous overloads before recreation
-- Drops all known historical signatures of purchase_platform_products
DROP FUNCTION IF EXISTS public.purchase_platform_products(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS public.purchase_platform_products(UUID, INTEGER, UUID, TEXT, TEXT);

-- 1. RPC: Purchase Platform Products (Wholesale)
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
    v_new_balance BIGINT;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quantity must be greater than zero');
    END IF;

    -- 0. Identity Validation: Verify merchant identity against auth.uid()
    IF NOT EXISTS (
        SELECT 1 FROM public.merchants 
        WHERE id = p_merchant_id AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
    END IF;

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
    UPDATE public.merchants SET wallet_balance_paise = wallet_balance_paise - v_total_cost 
    WHERE id = p_merchant_id 
    RETURNING wallet_balance_paise INTO v_new_balance;
    
    UPDATE public.shopping_products SET admin_stock = admin_stock - p_quantity WHERE id = p_product_id;

    -- 4. Add to merchant inventory
    INSERT INTO public.merchant_inventory (
        merchant_id, product_id, stock_quantity, retail_price_paise, 
        is_platform_product, is_active, custom_title, custom_description
    )
    SELECT 
        p_merchant_id, p_product_id, p_quantity, suggested_retail_price_paise, 
        true, false, title, description
    FROM public.shopping_products WHERE id = p_product_id
    ON CONFLICT (merchant_id, product_id) DO UPDATE
    SET stock_quantity = merchant_inventory.stock_quantity + p_quantity;

    -- 5. Log Order
    INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
    VALUES (p_merchant_id, 'merchant', NULL, 'admin', p_product_id, p_quantity, v_wholesale_price, v_total_cost, 'wholesale');

    -- 6. Log Merchant Transaction (With Post-Debit Balance)
    INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
    VALUES (p_merchant_id, 'purchase', -v_total_cost, v_new_balance, 'Wholesale purchase of products', jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity));

    RETURN jsonb_build_object('success', true, 'message', 'Purchase successful');
END;
$$;

-- Restricted Permissions
REVOKE ALL ON FUNCTION public.purchase_platform_products(UUID, INTEGER, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_platform_products(UUID, INTEGER, UUID) TO authenticated, service_role;

-- 2. RPC: Purchase Platform Products Bulk [NEW]
-- Handles Merchant buying multiple products from Admin in one atomic transaction
CREATE OR REPLACE FUNCTION public.purchase_platform_products_bulk(
    p_items JSONB[], -- Array of {product_id: UUID, quantity: INT}
    p_merchant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_qty INTEGER;
    v_item_price BIGINT;
    v_total_cost BIGINT := 0;
    v_merchant_balance BIGINT;
    v_new_balance BIGINT;
    v_product RECORD;
BEGIN
    -- 0. Identity Validation
    IF NOT EXISTS (
        SELECT 1 FROM public.merchants 
        WHERE id = p_merchant_id AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
    END IF;

    -- 1. Pre-validation loop: Check all stocks and calculate total cost
    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Quantity must be greater than zero');
        END IF;

        SELECT wholesale_price_paise, admin_stock, title INTO v_product
        FROM public.shopping_products WHERE id = v_product_id;

        IF v_product.admin_stock < v_qty THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock for ' || v_product.title);
        END IF;

        v_total_cost := v_total_cost + (v_product.wholesale_price_paise * v_qty);
    END LOOP;

    -- 2. Check and lock merchant balance
    SELECT wallet_balance_paise INTO v_merchant_balance
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    -- 3. Execute updates in a single loop
    v_new_balance := v_merchant_balance;

    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        SELECT wholesale_price_paise INTO v_item_price
        FROM public.shopping_products WHERE id = v_product_id FOR UPDATE;

        -- Update Stock
        UPDATE public.shopping_products SET admin_stock = admin_stock - v_qty WHERE id = v_product_id;

        -- Add to Inventory
        INSERT INTO public.merchant_inventory (
            merchant_id, product_id, stock_quantity, retail_price_paise, 
            is_platform_product, is_active, custom_title, custom_description
        )
        SELECT 
            p_merchant_id, v_product_id, v_qty, suggested_retail_price_paise, 
            true, false, title, description
        FROM public.shopping_products WHERE id = v_product_id
        ON CONFLICT (merchant_id, product_id) DO UPDATE
        SET stock_quantity = merchant_inventory.stock_quantity + v_qty;

        -- Log Order
        INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
        VALUES (p_merchant_id, 'merchant', NULL, 'admin', v_product_id, v_qty, v_item_price, v_item_price * v_qty, 'wholesale');

        -- Update local tracking for ledger
        v_new_balance := v_new_balance - (v_item_price * v_qty);

        -- Log Transaction (One per item for detailed history)
        INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
        VALUES (p_merchant_id, 'purchase', -(v_item_price * v_qty), v_new_balance, 'Wholesale bulk purchase', jsonb_build_object('product_id', v_product_id, 'quantity', v_qty));
    END LOOP;

    -- Final Balance Sync
    UPDATE public.merchants SET wallet_balance_paise = v_new_balance WHERE id = p_merchant_id;

    RETURN jsonb_build_object('success', true, 'message', 'Bulk purchase successful');
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_platform_products_bulk(JSONB[], UUID) TO authenticated, service_role;

-- 3. RPC: Customer Purchase From Merchant (Retail)
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
    v_new_merchant_balance BIGINT;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quantity must be greater than zero');
    END IF;

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
    
    UPDATE public.merchants SET wallet_balance_paise = wallet_balance_paise + v_total_cost 
    WHERE id = v_inventory.merchant_id 
    RETURNING wallet_balance_paise INTO v_new_merchant_balance;
    
    UPDATE public.merchant_inventory SET stock_quantity = stock_quantity - p_quantity WHERE id = p_inventory_id;

    -- 4. Log Order
    INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
    VALUES (p_customer_id, 'customer', v_inventory.merchant_id, 'merchant', v_inventory.product_id, p_quantity, v_inventory.retail_price_paise, v_total_cost, 'retail');

    -- 5. Log Merchant Transaction (With running balance)
    INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
    VALUES (v_inventory.merchant_id, 'sale_earnings', v_total_cost, v_new_merchant_balance, 'Product sale to customer', jsonb_build_object('buyer_id', p_customer_id, 'product_id', v_inventory.product_id));

    RETURN jsonb_build_object('success', true, 'message', 'Order placed successfully');
END;
$$;

-- 4. RPC: Customer Bulk Purchase V2 (Enhanced Ledger)
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
    v_merchant_balance BIGINT;
BEGIN
    -- 1. Pre-validation and total cost calculation
    SELECT wallet_balance_paise INTO v_customer_balance
    FROM public.user_profiles WHERE id = p_customer_id FOR UPDATE;

    FOREACH v_item IN ARRAY p_items LOOP
        IF (v_item->>'quantity')::INTEGER <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Item quantity must be greater than zero');
        END IF;

        IF (v_item->>'is_platform')::BOOLEAN THEN
            SELECT admin_stock, suggested_retail_price_paise, title INTO v_product 
            FROM public.shopping_products WHERE id = (v_item->>'product_id')::UUID;
            
            IF v_product.admin_stock < (v_item->>'quantity')::INTEGER THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient platform stock for ' || v_product.title);
            END IF;
            v_total_cost := v_total_cost + (v_product.suggested_retail_price_paise * (v_item->>'quantity')::INTEGER);
        ELSE
            SELECT stock_quantity, retail_price_paise INTO v_inventory 
            FROM public.merchant_inventory WHERE id = (v_item->>'inventory_id')::UUID;
            
            IF v_inventory.stock_quantity < (v_item->>'quantity')::INTEGER THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant stock');
            END IF;
            v_total_cost := v_total_cost + (v_inventory.retail_price_paise * (v_item->>'quantity')::INTEGER);
        END IF;
    END LOOP;

    IF v_customer_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    -- 2. Processing items
    FOREACH v_item IN ARRAY p_items LOOP
        IF (v_item->>'is_platform')::BOOLEAN THEN
            SELECT id, suggested_retail_price_paise INTO v_product 
            FROM public.shopping_products WHERE id = (v_item->>'product_id')::UUID FOR UPDATE;
            v_item_cost := v_product.suggested_retail_price_paise * (v_item->>'quantity')::INTEGER;
            
            UPDATE public.shopping_products SET admin_stock = admin_stock - (v_item->>'quantity')::INTEGER WHERE id = v_product.id;
            
            INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
            VALUES (p_customer_id, 'customer', NULL, 'admin', v_product.id, (v_item->>'quantity')::INTEGER, v_product.suggested_retail_price_paise, v_item_cost, 'retail');
        ELSE
            SELECT * INTO v_inventory FROM public.merchant_inventory WHERE id = (v_item->>'inventory_id')::UUID FOR UPDATE;
            v_item_cost := v_inventory.retail_price_paise * (v_item->>'quantity')::INTEGER;
            
            UPDATE public.merchant_inventory SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER WHERE id = v_inventory.id;
            
            UPDATE public.merchants SET wallet_balance_paise = wallet_balance_paise + v_item_cost 
            WHERE id = v_inventory.merchant_id 
            RETURNING wallet_balance_paise INTO v_merchant_balance;
            
            INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
            VALUES (p_customer_id, 'customer', v_inventory.merchant_id, 'merchant', v_inventory.product_id, (v_item->>'quantity')::INTEGER, v_inventory.retail_price_paise, v_item_cost, 'retail');
            
            INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
            VALUES (v_inventory.merchant_id, 'sale_earnings', v_item_cost, v_merchant_balance, 'Product sale to customer', jsonb_build_object('buyer_id', p_customer_id, 'product_id', v_inventory.product_id));
        END IF;
    END LOOP;

    -- 3. Update customer balance
    UPDATE public.user_profiles SET wallet_balance_paise = wallet_balance_paise - v_total_cost WHERE id = p_customer_id;

    RETURN jsonb_build_object('success', true, 'message', 'All orders placed successfully');
END;
$$;

-- Permissions for retail RPCs
GRANT EXECUTE ON FUNCTION public.customer_purchase_from_merchant(UUID, INTEGER, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_bulk_purchase_v2(JSONB[], UUID) TO authenticated, service_role;

-- ================================================
-- POST-MIGRATION VERIFICATION
-- ================================================
DO $$
BEGIN
    -- Ensure exactly one signature exists for key purchase functions
    IF (SELECT count(*) FROM pg_proc WHERE proname = 'purchase_platform_products' AND pronamespace = 'public'::regnamespace) > 1 THEN
        RAISE EXCEPTION 'Ambiguous function signatures detected for purchase_platform_products. Cleanup failed.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'purchase_platform_products_bulk' AND pronamespace = 'public'::regnamespace) THEN
        RAISE EXCEPTION 'purchase_platform_products_bulk was not created successfully.';
    END IF;
END $$;
