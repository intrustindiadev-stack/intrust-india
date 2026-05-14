-- Enable RLS (good practice)
alter table public.otp_codes enable row level security;

-- Create policy to allow service role full access
-- Service role key bypasses RLS by default, but explict policies can sometimes be needed if things are weird
-- Actually, service role bypasses EVERYTHING.
-- However, if the table was created NOT in public schema or permissions were revoked..

-- Grant usage on schema public to anon and authenticated
grant usage on schema public to postgres, anon, authenticated, service_role;

-- Grant all privileges on otp_codes to service_role (postgres)
grant all privileges on table public.otp_codes to service_role;
grant all privileges on table public.otp_codes to postgres;

-- Just in case, create a permissive policy for service role (using a trick, though service_role bypasses policies)
-- The error "permission denied" usually means the ROLE itself doesn't have GRANT on the TABLE.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.otp_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.otp_codes TO postgres;

-- Verify table owner
ALTER TABLE public.otp_codes OWNER TO postgres;
