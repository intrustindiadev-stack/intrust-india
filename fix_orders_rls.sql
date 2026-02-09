-- Enable RLS on the orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 1. Grant usage on schema public (usually default, but good to be explicit)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.orders TO authenticated;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.orders;

-- 3. Create comprehensive policies

-- Allow users to insert orders where they are the owner
CREATE POLICY "Users can insert own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own orders
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Grant access to the sequence (if id is serial, though it's uuid here so this is just in case)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
