-- Drop the trigger that automatically syncs every new user to CRM leads
DROP TRIGGER IF EXISTS sync_user_trigger ON user_profiles;

-- Optionally, drop the function to clean up
DROP FUNCTION IF EXISTS sync_user_to_crm();
