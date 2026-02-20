-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    client_txn_id TEXT UNIQUE NOT NULL,
    sabpaisa_txn_id TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2),
    currency TEXT DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'INITIATED', -- INITIATED, SUCCESS, FAILED, ABORTED, PENDING
    status_code TEXT,
    sabpaisa_message TEXT,
    bank_message TEXT,
    payment_mode TEXT,
    bank_name TEXT,
    bank_txn_id TEXT,
    rrn TEXT,
    payer_name TEXT,
    payer_email TEXT,
    payer_mobile TEXT,
    payer_address TEXT,
    udf1 TEXT,
    udf2 TEXT,
    udf3 TEXT,
    udf4 TEXT,
    udf5 TEXT,
    callback_url TEXT,
    webhook_received BOOLEAN DEFAULT FALSE,
    refund_status TEXT, -- NONE, REQUESTED, PROCESSED, FAILED
    settlement_status TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_logs table for debugging
CREATE TABLE IF NOT EXISTS public.transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_txn_id TEXT REFERENCES public.transactions(client_txn_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- INITIATE, CALLBACK, WEBHOOK, VERIFY, REFUND
    payload JSONB,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_created_at ON public.transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_client_txn_id ON public.transactions(client_txn_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sabpaisa_txn_id ON public.transactions(sabpaisa_txn_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own transactions (for initiation)
CREATE POLICY "Users can insert own transactions" ON public.transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role (server-side) has full access - usually implicit, but good to be aware.
-- Note: Subapase service role key bypasses RLS.

-- RLS Policies for transaction_logs
-- Only viewable by the user who owns the transaction (via client_txn_id join) or admins.
-- For simplicity, we might restrict logs to admins or service role only, 
-- but letting users see logs *might* be useful for debugging if properly scoped.
-- Let's restrict to service role for now to prevent leaking sensitive data in logs.
CREATE POLICY "No access for anon/authenticated on logs" ON public.transaction_logs
    FOR ALL
    USING (false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
