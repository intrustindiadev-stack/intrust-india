-- Grant EXECUTE on get_user_id_by_phone to anon and authenticated roles
-- so the browser client (PostgREST) can call it during login/signup phone check.
-- NOTE: This migration was already applied live via MCP on 2026-05-16.
GRANT EXECUTE ON FUNCTION public.get_user_id_by_phone(text) TO anon, authenticated;

-- Verify
DO $verify$
BEGIN
  IF NOT has_function_privilege('anon', 'public.get_user_id_by_phone(text)', 'execute') THEN
    RAISE EXCEPTION 'GRANT failed: anon still cannot execute get_user_id_by_phone';
  END IF;
END $verify$;
