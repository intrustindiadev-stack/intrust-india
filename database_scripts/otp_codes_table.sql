-- Ensure pgcrypto extension is available for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Create table for storing OTP codes
create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts int default 0,
  max_attempts int default 5,
  is_used boolean default false,
  created_at timestamptz default now()
);

-- Index for fast lookups by phone number and checking rate limits
create index if not exists idx_otp_codes_phone_created_at on public.otp_codes (phone, created_at desc);

-- Comment on table
comment on table public.otp_codes is 'Stores hashed OTP codes for phone verification with rate limiting and expiry tracking.';

-- Helper function to get user ID by phone
-- Required because strictly querying auth.users is restricted
create or replace function public.get_user_id_by_phone(phone_number text)
returns uuid
language plpgsql
security definer
as $$
declare
  _user_id uuid;
begin
  select id into _user_id
  from auth.users
  where phone = phone_number
  limit 1;
  return _user_id;
end;
$$;
