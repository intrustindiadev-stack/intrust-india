-- Create an RPC to safely look up user IDs by email bypassing PostgREST exposure
CREATE OR REPLACE FUNCTION get_user_id_by_email(email_address text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id uuid;
BEGIN
  -- We query auth.users directly. The SECURITY DEFINER allows this function 
  -- to run with the privileges of the creator (postgres/supabase_admin), 
  -- meaning it can read auth.users even when called by anon.
  SELECT id INTO found_user_id
  FROM auth.users
  WHERE lower(email) = lower(email_address)
  LIMIT 1;

  RETURN found_user_id;
END;
$$;

-- Grant execution to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_user_id_by_email(text) TO anon, authenticated, service_role;
