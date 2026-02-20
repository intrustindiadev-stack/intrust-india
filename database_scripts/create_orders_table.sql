-- Create the 'orders' table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  coupon_id UUID REFERENCES public.coupons(id),
  amount_paise BIGINT NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'created', -- 'created', 'paid', 'failed'
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create their own orders
CREATE POLICY "Users can insert own orders" 
  ON public.orders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own orders
CREATE POLICY "Users can view own orders" 
  ON public.orders FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Service Role / Admins can do everything (Postgres default for Service Role, but good to be explicit if needed)
-- Note: Service Role bypasses RLS automatically.

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders(razorpay_order_id);
