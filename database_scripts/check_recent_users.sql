select 
  au.id as auth_id,
  au.phone as auth_phone,
  au.created_at as auth_created_at,
  au.last_sign_in_at,
  up.full_name as profile_name,
  up.role as profile_role
from auth.users au
left join public.user_profiles up on au.id = up.id
order by au.created_at desc
limit 5;
