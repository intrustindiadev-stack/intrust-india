-- =========================================================
-- UDHARI (Deferred Payment) SCHEMA
-- Merchant-approved store credit system for gift cards
-- 0% interest, 0 late fees — legally compliant in India
-- =========================================================

-- 1. Add 'reserved' to coupon_status enum
-- NOTE: Run separately outside transaction:
-- ALTER TYPE coupon_status ADD VALUE IF NOT EXISTS 'reserved';

-- 2. udhari_requests — core deferred payment ledger
CREATE TABLE public.udhari_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','denied','completed','expired','cancelled')),
  duration_days INT NOT NULL DEFAULT 15 CHECK (duration_days IN (5, 10, 15)),
  due_date TIMESTAMPTZ,
  merchant_note TEXT,
  customer_note TEXT,
  disclaimer_accepted BOOLEAN NOT NULL DEFAULT false,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.udhari_requests IS 'Deferred payment (store credit) requests between customers and merchants. Not a loan — 0% interest.';

-- 3. merchant_udhari_settings — per-merchant configuration
CREATE TABLE public.merchant_udhari_settings (
  merchant_id UUID PRIMARY KEY REFERENCES public.merchants(id) ON DELETE CASCADE,
  udhari_enabled BOOLEAN NOT NULL DEFAULT false,
  max_credit_limit_paise BIGINT DEFAULT 500000,
  max_duration_days INT DEFAULT 15 CHECK (max_duration_days IN (5, 10, 15)),
  min_customer_age_days INT DEFAULT 0,
  extra_fee_paise BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. udhari_reminders — reminder audit trail
CREATE TABLE public.udhari_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  udhari_request_id UUID NOT NULL REFERENCES public.udhari_requests(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('1_day','3_day','due_day','overdue')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app','sms'))
);

-- INDEXES
CREATE INDEX idx_udhari_requests_customer ON public.udhari_requests(customer_id);
CREATE INDEX idx_udhari_requests_merchant ON public.udhari_requests(merchant_id);
CREATE INDEX idx_udhari_requests_coupon ON public.udhari_requests(coupon_id);
CREATE INDEX idx_udhari_requests_status ON public.udhari_requests(status);
CREATE INDEX idx_udhari_requests_due_date ON public.udhari_requests(due_date);
CREATE INDEX idx_udhari_reminders_request ON public.udhari_reminders(udhari_request_id);

-- RLS
ALTER TABLE public.udhari_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_udhari_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.udhari_reminders ENABLE ROW LEVEL SECURITY;

-- Customers can view their own requests
CREATE POLICY "customers_view_own_udhari" ON public.udhari_requests
  FOR SELECT USING (auth.uid() = customer_id);

-- Merchants can view requests for their merchant_id
CREATE POLICY "merchants_view_own_udhari" ON public.udhari_requests
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );

-- Merchant settings: owner can read and manage
CREATE POLICY "merchant_read_udhari_settings" ON public.merchant_udhari_settings
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );

CREATE POLICY "merchant_update_udhari_settings" ON public.merchant_udhari_settings
  FOR UPDATE USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );

-- Reminders: customers can view their own reminders
CREATE POLICY "customers_view_own_reminders" ON public.udhari_reminders
  FOR SELECT USING (
    udhari_request_id IN (SELECT id FROM public.udhari_requests WHERE customer_id = auth.uid())
  );

-- 5. Settle Udhari Payment RPC
CREATE OR REPLACE FUNCTION public.settle_udhari_payment(
  p_udhari_request_id uuid,
  p_customer_user_id uuid,
  p_extra_fee_paise bigint,
  p_customer_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_udhari record;
  v_wallet record;
  v_coupon record;
  v_total_paise bigint;
  v_order_id uuid;
BEGIN
  -- 1. Lock & fetch the udhari request
  SELECT * INTO v_udhari
  FROM udhari_requests
  WHERE id = p_udhari_request_id
    AND customer_id = p_customer_user_id
    AND status = 'approved'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'udhari_not_found';
  END IF;

  -- 2. Lock & fetch the customer wallet
  SELECT * INTO v_wallet
  FROM customer_wallets
  WHERE user_id = p_customer_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  -- 3. Compute amounts
  v_total_paise := v_udhari.amount_paise + p_extra_fee_paise;
  IF v_wallet.balance_paise < v_total_paise THEN
    RAISE EXCEPTION 'insufficient_balance:%', v_wallet.balance_paise;
  END IF;

  -- 4. Lock & verify coupon
  SELECT * INTO v_coupon
  FROM coupons
  WHERE id = v_udhari.coupon_id
    AND status = 'reserved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon_not_reserved';
  END IF;

  -- 5. Deduct wallet
  UPDATE customer_wallets
  SET balance_paise = balance_paise - v_total_paise
  WHERE id = v_wallet.id;

  -- 6. Mark coupon sold
  UPDATE coupons
  SET status = 'sold',
      purchased_by = p_customer_user_id,
      purchased_at = NOW()
  WHERE id = v_coupon.id;

  -- 7. Insert order
  INSERT INTO orders (
    user_id, merchant_id, giftcard_id, amount, payment_status, created_at
  ) VALUES (
    p_customer_user_id, v_udhari.merchant_id, v_coupon.id, v_total_paise, 'paid', NOW()
  ) RETURNING id INTO v_order_id;

  -- 8. Insert customer wallet ledger
  INSERT INTO customer_wallet_transactions (
    wallet_id, user_id, type, amount_paise,
    balance_before_paise, balance_after_paise,
    description, reference_id, reference_type
  ) VALUES (
    v_wallet.id, p_customer_user_id, 'DEBIT', v_total_paise,
    v_wallet.balance_paise, v_wallet.balance_paise - v_total_paise,
    'Udhari Settlement: ' || COALESCE(v_coupon.brand, 'Gift Card') || ' - ' || COALESCE(v_coupon.title, '') || 
    CASE WHEN p_extra_fee_paise > 0 THEN ' (incl. ₹' || (p_extra_fee_paise / 100.0)::numeric(10,2)::text || ' fee)' ELSE '' END,
    p_udhari_request_id, 'UDHARI_PAYMENT'
  );

  -- 9. Insert merchant transaction ledger
  INSERT INTO merchant_transactions (
    merchant_id, transaction_type, amount_paise, commission_paise,
    description, metadata
  ) VALUES (
    v_udhari.merchant_id, 'udhari_payment', v_udhari.amount_paise, 0,
    'Udhari Paid: ' || COALESCE(v_coupon.title, 'Gift Card') || COALESCE(' (Cust: ' || p_customer_email || ')', ''),
    jsonb_build_object(
      'udhari_request_id', p_udhari_request_id,
      'customer_id', p_customer_user_id,
      'coupon_id', v_coupon.id
    )
  );

  -- 10. Mark udhari completed
  UPDATE udhari_requests
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = p_udhari_request_id;

  -- 11. Return success response
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'new_balance_paise', v_wallet.balance_paise - v_total_paise
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_udhari_payment(uuid, uuid, bigint, text) TO service_role;

-- =========================================================
-- 6. Expire Overdue Udhari Requests Daily Job (pg_cron)
-- =========================================================

CREATE OR REPLACE FUNCTION public.expire_overdue_udhari()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request record;
BEGIN
  -- Loop through all approved requests past their due date
  FOR v_request IN
    SELECT u.id, u.customer_id, u.merchant_id, u.coupon_id, u.amount_paise, c.title, c.brand
    FROM udhari_requests u
    LEFT JOIN coupons c ON u.coupon_id = c.id
    WHERE u.status = 'approved' AND u.due_date < NOW()
  LOOP
    -- 1. Mark as expired
    UPDATE udhari_requests
    SET status = 'expired',
        expired_at = NOW()
    WHERE id = v_request.id;

    -- 2. Revert coupon
    UPDATE coupons
    SET status = 'available'
    WHERE id = v_request.coupon_id
      AND status = 'reserved';

    -- 3. Notify Customer
    INSERT INTO notifications (
      user_id, title, body, type, reference_id, reference_type
    ) VALUES (
      v_request.customer_id,
      'Store Credit Expired ⚠️',
      'Your deferred payment request for "' || COALESCE(v_request.title, v_request.brand, 'Gift Card') || '" has expired as it was not paid by the due date.',
      'error',
      v_request.id,
      'udhari_expired'
    );

    -- 4. Notify Merchant
    INSERT INTO notifications (
      user_id, title, body, type, reference_id, reference_type
    ) SELECT
      user_id,
      'Udhari Expired ⚠️',
      'A deferred payment request for ₹' || (v_request.amount_paise / 100.0)::numeric(10,2)::text || ' has expired and the gift card is available again.',
      'warning',
      v_request.id,
      'udhari_expired'
    FROM merchants WHERE id = v_request.merchant_id;
  END LOOP;
END;
$$;

-- IMPORTANT: To schedule this job, run the following as a superuser:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('expire-udhari-daily', '0 0 * * *', 'SELECT public.expire_overdue_udhari()');
