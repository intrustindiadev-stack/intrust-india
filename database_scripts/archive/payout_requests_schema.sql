-- =============================================================
-- PAYOUT REQUESTS SCHEMA
-- Merchants submit withdrawal requests from their wallet
-- Admin reviews and manually releases payments
-- =============================================================

-- Create payout_requests table
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending',
    -- Status flow: pending -> approved -> released
    --               pending -> rejected (refund happens)
    CONSTRAINT payout_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'released')),
    bank_account_number TEXT NOT NULL,
    bank_ifsc TEXT NOT NULL,
    bank_account_holder TEXT NOT NULL,
    bank_name TEXT,
    admin_note TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payout_requests_merchant_id ON public.payout_requests(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requested_at ON public.payout_requests(requested_at DESC);

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Merchant can view their own payout requests
CREATE POLICY "merchant_view_own_payout_requests" ON public.payout_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Merchant can insert their own payout requests
CREATE POLICY "merchant_insert_own_payout_requests" ON public.payout_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admin can view ALL payout requests
CREATE POLICY "admin_view_all_payout_requests" ON public.payout_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admin can update payout requests (approve/reject/release)
CREATE POLICY "admin_update_payout_requests" ON public.payout_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_payout_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payout_requests_updated_at
    BEFORE UPDATE ON public.payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_payout_requests_updated_at();

-- Comments
COMMENT ON TABLE public.payout_requests IS 'Merchant withdrawal/payout requests to be manually released by admin';
COMMENT ON COLUMN public.payout_requests.status IS 'pending | approved | rejected | released';
COMMENT ON COLUMN public.payout_requests.admin_note IS 'Admin note on approval or rejection reason';
