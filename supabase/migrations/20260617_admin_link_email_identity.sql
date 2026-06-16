-- Migration: promote admin_link_email_identity to a versioned function.
--
-- Previously only created by scripts/mcp-server/backfill_email_identities.js.
-- This migration ensures the function exists on every environment (local,
-- staging, production) without manual script execution.
--
-- The function is called by:
--   • app/api/auth/email/link-to-phone-user/route.js  (new, Ticket 2)
--   • app/api/auth/email/link-provider/route.js        (existing)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_link_email_identity(
    target_user_id uuid,
    target_email   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO auth.identities (
        id,
        user_id,
        provider,
        identity_data,
        last_sign_in_at,
        created_at,
        updated_at
    )
    VALUES (
        target_user_id,                 -- for email provider, identity id = user id
        target_user_id,
        'email',
        jsonb_build_object(
            'sub',            target_user_id::text,
            'email',          target_email,
            'email_verified', true
        ),
        now(),
        now(),
        now()
    )
    ON CONFLICT (provider, id) DO NOTHING;
END;
$$;

-- Grant execute to the service role (used by admin client in API routes).
-- The anon role must NOT be able to call this directly.
REVOKE ALL ON FUNCTION public.admin_link_email_identity(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_link_email_identity(uuid, text) TO service_role;
