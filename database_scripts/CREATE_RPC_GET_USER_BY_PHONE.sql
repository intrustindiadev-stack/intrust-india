-- ============================================================
-- RPC: get_user_id_by_phone
-- Purpose: Safely check if a phone number exists in Auth
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_id_by_phone(phone_number text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to read auth schema
AS $$
BEGIN
  -- We check both formats (+91 and plain) just in case
  RETURN (
    SELECT id 
    FROM auth.users 
    WHERE phone = phone_number 
       OR phone = '+91' || phone_number
    LIMIT 1
  );
END;
$$;

-- Grant execution to public so frontend can call it
GRANT EXECUTE ON FUNCTION public.get_user_id_by_phone(text) TO anon, authenticated, service_role;
