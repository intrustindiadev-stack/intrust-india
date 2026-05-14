-- Create the restock_notifications table
CREATE TABLE IF NOT EXISTS public.restock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shopping_products(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.merchant_inventory(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  is_notified BOOLEAN DEFAULT FALSE,
  UNIQUE(product_id, inventory_id, email)
);

-- Enable RLS
ALTER TABLE public.restock_notifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (Public "Notify Me" functionality)
CREATE POLICY "public_insert_restock_notifications" ON public.restock_notifications
  FOR INSERT WITH CHECK (true);

-- Only admins can view the requests
CREATE POLICY "admin_view_restock_notifications" ON public.restock_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Only service role or admins can update (to mark as notified)
CREATE POLICY "admin_update_restock_notifications" ON public.restock_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );
