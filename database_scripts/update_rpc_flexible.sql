-- Update the helper function to be more flexible with phone number formats
-- We will pass the 10-digit number, and it should find any user whose phone ends with these digits.

create or replace function public.get_user_id_by_phone(phone_number text)
returns uuid
language plpgsql
security definer
as $$
declare
  _user_id uuid;
begin
  -- Check for exact match OR if the stored phone ends with the provided number (assuming input is 10 digits)
  select id into _user_id
  from auth.users
  where phone = phone_number
     or phone like '%' || phone_number
  limit 1;
  return _user_id;
end;
$$;
