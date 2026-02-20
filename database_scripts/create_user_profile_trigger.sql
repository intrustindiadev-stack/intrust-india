-- Optional: Create trigger to automatically create user profile
-- Run this if you want user_profiles to be created automatically on signup
-- Note: The application handles missing profiles gracefully, but this is best practice.

-- 1. Create the function
create or replace function public.handle_new_user()
returns trigger as $$
declare
  name_val text;
  avatar_val text;
begin
  -- Extract name and avatar from raw_user_meta_data (used by OAuth providers like Google)
  name_val := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User');
  avatar_val := new.raw_user_meta_data->>'avatar_url';

  insert into public.user_profiles (id, phone, full_name, avatar_url, role)
  values (
    new.id, 
    new.phone, 
    name_val,
    avatar_val,
    'user' -- CHANGED from 'customer' to 'user' to match DB constraints
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger
-- Drop first to avoid errors if re-running
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
