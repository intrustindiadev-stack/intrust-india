CREATE OR REPLACE FUNCTION merchant_approve_udhari_request(
    p_request_id uuid,
    p_duration_days int,
    p_merchant_note text,
    p_disclaimer_accepted boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request record;
    v_group record;
    v_item record;
    v_merchant_inventory_stock int;
BEGIN
    -- 1. Lock udhari_request
    SELECT * INTO v_request
    FROM udhari_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Udhari request % not found', p_request_id;
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Udhari request is not in pending status';
    END IF;

    -- 2. Process based on source_type
    IF v_request.source_type = 'shop_order' THEN
        -- Lock and process shopping order group
        SELECT * INTO v_group
        FROM shopping_order_groups
        WHERE id = v_request.shopping_order_group_id
        FOR UPDATE;

        IF v_group IS NULL THEN
            RAISE EXCEPTION 'Shopping order group % not found', v_request.shopping_order_group_id;
        END IF;

        -- Iterate items and decrement stock
        FOR v_item IN
            SELECT * FROM shopping_order_items WHERE group_id = v_group.id
        LOOP
            -- Lock merchant_inventory
            SELECT stock_quantity INTO v_merchant_inventory_stock
            FROM merchant_inventory
            WHERE id = v_item.inventory_id
            FOR UPDATE;

            IF v_merchant_inventory_stock < v_item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for merchant_inventory_id %', v_item.inventory_id;
            END IF;

            UPDATE merchant_inventory
            SET stock_quantity = stock_quantity - v_item.quantity
            WHERE id = v_item.inventory_id;
        END LOOP;

        -- Update order group
        UPDATE shopping_order_groups
        SET delivery_status = 'pending',
            payment_method = 'store_credit'
        WHERE id = v_group.id;

    ELSIF v_request.source_type = 'gift_card' THEN
        -- Lock and process gift card / coupons
        UPDATE coupons
        SET status = 'reserved'
        WHERE id = v_request.coupon_id AND status = 'available';

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Coupon % not found or not available', v_request.coupon_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'Unknown source_type %', v_request.source_type;
    END IF;

    -- 3. Update udhari request
    UPDATE udhari_requests
    SET status = 'approved',
        due_date = CURRENT_DATE + p_duration_days,
        duration_days = p_duration_days,
        disclaimer_accepted = p_disclaimer_accepted,
        merchant_note = p_merchant_note,
        responded_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Revoke all and grant to service_role
REVOKE ALL ON FUNCTION merchant_approve_udhari_request(uuid, int, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION merchant_approve_udhari_request(uuid, int, text, boolean) TO service_role;
