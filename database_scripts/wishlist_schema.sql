-- Create the table
CREATE TABLE IF NOT EXISTS public.user_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shopping_products(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES public.merchant_inventory(id) ON DELETE SET NULL,
  is_platform_item BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)  -- prevent duplicate saves
);

-- Enable RLS
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own wishlist
CREATE POLICY "wishlist_owner_all" ON public.user_wishlists
  FOR ALL USING (auth.uid() = user_id);
