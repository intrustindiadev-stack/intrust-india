-- Create payment_session_recovery table for securely bridging cross-site POST redirects
-- (Safari ITP / WebKit SameSite enforcement workaround)

CREATE TABLE IF NOT EXISTS public.payment_session_recovery (
    txn_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_session_data TEXT NOT NULL,
    recovery_token_hash TEXT,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.payment_session_recovery ENABLE ROW LEVEL SECURITY;

-- ── SECURITY LOCKDOWN ──
-- Do NOT create any policies for anon, authenticated, or public access.
-- By default, tables with RLS enabled and no policies Deny All requests.
-- Only the service_role key (used exclusively on the backend API routes)
-- can bypass RLS to read or write to this table.
-- This ensures the tokens are completely opaque and inaccessible from the browser.
