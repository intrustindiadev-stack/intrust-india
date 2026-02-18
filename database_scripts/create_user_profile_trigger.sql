-- Optional: Create trigger to automatically create user profile
-- Run this if you want user_profiles to be created automatically on signup
-- Note: The application handles missing profiles gracefully, but this is best practice.

-- 1. Create the function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, phone, role)
  values (new.id, new.phone, 'customer');
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
