-- 20260505_webchat_persistence.sql

CREATE TABLE IF NOT EXISTS public.webchat_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_active_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webchat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.webchat_sessions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'model')),
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webchat_messages_session_id ON public.webchat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_webchat_sessions_user_id ON public.webchat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_webchat_messages_created_at ON public.webchat_messages(session_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.webchat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webchat_messages ENABLE ROW LEVEL SECURITY;

-- webchat_sessions policies
CREATE POLICY "Users can view their own sessions"
    ON public.webchat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
    ON public.webchat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
    ON public.webchat_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- webchat_messages policies
CREATE POLICY "Users can view their own messages"
    ON public.webchat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
    ON public.webchat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);
