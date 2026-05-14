-- Fix the trigger function to handle required columns
-- PROBLEM: The previous trigger failed because `full_name` is NOT NULL in `user_profiles` table, 
-- but we were not providing it.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, phone, role, full_name, is_suspended)
  values (
    new.id, 
    new.phone, 
    'customer', 
    'New User', -- Default name since it's required
    false       -- Default suspension status
  );
  return new;
end;
$$ language plpgsql security definer;

-- Re-create the trigger to be sure
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
