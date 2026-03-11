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
