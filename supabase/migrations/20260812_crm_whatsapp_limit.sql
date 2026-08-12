-- Create crm_message_usage table
CREATE TABLE IF NOT EXISTS public.crm_message_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crm_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a user only has one row per day
CREATE UNIQUE INDEX IF NOT EXISTS crm_message_usage_user_date_idx 
ON public.crm_message_usage (crm_user_id, usage_date);

-- Enable RLS
ALTER TABLE public.crm_message_usage ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own usage"
ON public.crm_message_usage FOR SELECT
TO authenticated
USING (auth.uid() = crm_user_id);

CREATE POLICY "Service role has full access to usage"
ON public.crm_message_usage FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view all usage"
ON public.crm_message_usage FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
);

-- RPC for atomic increment
CREATE OR REPLACE FUNCTION public.increment_crm_whatsapp_usage(p_crm_user_id UUID, p_date DATE, p_limit INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_count INTEGER;
    v_old_count INTEGER;
BEGIN
    -- Lock the row if it exists
    SELECT message_count INTO v_old_count 
    FROM public.crm_message_usage 
    WHERE crm_user_id = p_crm_user_id AND usage_date = p_date 
    FOR UPDATE;

    IF v_old_count IS NULL THEN
        -- Does not exist, try to insert
        INSERT INTO public.crm_message_usage (crm_user_id, usage_date, message_count, created_at, updated_at)
        VALUES (p_crm_user_id, p_date, 1, NOW(), NOW())
        ON CONFLICT (crm_user_id, usage_date) 
        DO UPDATE SET message_count = public.crm_message_usage.message_count + 1, updated_at = NOW()
        RETURNING message_count INTO v_new_count;
        
        -- If another transaction inserted it right before us and it was already at limit, 
        -- the DO UPDATE would increment it. Let's make the DO UPDATE safe as well.
        -- Actually, since we want to be perfectly safe:
    ELSE
        IF v_old_count >= p_limit THEN
            RETURN -1;
        END IF;

        UPDATE public.crm_message_usage
        SET message_count = message_count + 1, updated_at = NOW()
        WHERE crm_user_id = p_crm_user_id AND usage_date = p_date
        RETURNING message_count INTO v_new_count;
    END IF;

    RETURN v_new_count;
END;
$$;
