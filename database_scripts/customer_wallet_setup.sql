-- Phase 2: Customer Wallet & Gold Subscription Setup

-- 1. Update User Profiles with Gold Status Fields
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_gold_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ DEFAULT NULL;

-- 2. Create Customer Wallets Table
CREATE TABLE IF NOT EXISTS public.customer_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance_paise BIGINT DEFAULT 0 NOT NULL, -- Use BIGINT/Paise to avoid floating point issues
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_customer_wallet_user UNIQUE (user_id)
);

-- 3. Create Customer Wallet Transactions Table
CREATE TABLE IF NOT EXISTS public.customer_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.customer_wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT', 'CASHBACK', 'TOPUP', 'REFUND')),
    amount_paise BIGINT NOT NULL,
    balance_before_paise BIGINT NOT NULL,
    balance_after_paise BIGINT NOT NULL,
    description TEXT,
    reference_id TEXT, -- E.g., Order ID, Payment ID
    reference_type TEXT, -- E.g., 'SUBSCRIPTION', 'GIFT_CARD', 'SABPAISA'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.customer_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Policies for customer_wallets
CREATE POLICY "Users can view their own wallet" 
ON public.customer_wallets FOR SELECT 
USING (auth.uid() = user_id);

-- 6. Policies for customer_wallet_transactions
CREATE POLICY "Users can view their own transactions" 
ON public.customer_wallet_transactions FOR SELECT 
USING (auth.uid() = user_id);

-- 7. Trigger to auto-create wallet on profile creation (optional but recommended)
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.customer_wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists on user_profiles or auth.users? 
-- Usually user_profiles has the trigger. If you have an existing trigger, 
-- you can add this logic there or create a separate one.

-- 8. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.customer_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON public.customer_wallets(user_id);
