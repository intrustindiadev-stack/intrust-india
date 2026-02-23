-- =============================================================
-- NOTIFICATIONS SCHEMA
-- In-app notifications for merchants and admins
-- Used for payout request status updates and system alerts
-- =============================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    CONSTRAINT notification_type_check CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    reference_id UUID,          -- e.g. payout_requests.id
    reference_type TEXT,        -- e.g. 'payout_request'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_reference_id ON public.notifications(reference_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "users_view_own_notifications" ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "users_update_own_notifications" ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.notifications IS 'In-app notifications for merchants and admins';
COMMENT ON COLUMN public.notifications.reference_id IS 'UUID of the related entity (e.g. payout_requests.id)';
COMMENT ON COLUMN public.notifications.reference_type IS 'Type of related entity, e.g. payout_request';
