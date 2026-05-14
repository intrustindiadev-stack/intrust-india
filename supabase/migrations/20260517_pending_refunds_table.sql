CREATE TABLE IF NOT EXISTS public.pending_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL,
    amount_paise BIGINT NOT NULL,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id),
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending, processed, failed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pending_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their own pending refunds"
    ON public.pending_refunds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.merchants m
            WHERE m.id = pending_refunds.merchant_id
            AND m.user_id = auth.uid()
        )
    );
