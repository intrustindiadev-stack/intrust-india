BEGIN;

UPDATE user_profiles 
SET avatar_url = REPLACE(avatar_url, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase')
WHERE avatar_url LIKE '%bhgbylyzlwmmabegxlfc.supabase.co%';

COMMIT;
