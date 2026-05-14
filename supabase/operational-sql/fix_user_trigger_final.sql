-- CRITICAL FIX: The enum value 'customer' does NOT exist. 
-- The valid values are: 'user', 'admin'.
-- Also handling created_at and updated_at explicitly.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (
    id, 
    phone, 
    role, 
    full_name, 
    is_suspended, 
    created_at, 
    updated_at
  )
  values (
    new.id, 
    new.phone, 
    'user', -- CHANGED from 'customer' to 'user' based on enum check
    'New User', 
    false,
    now(),
    now()
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
