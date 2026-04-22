-- Create merchant_notification_settings table
CREATE TABLE IF NOT EXISTS public.merchant_notification_settings (
    merchant_id uuid PRIMARY KEY REFERENCES public.merchants(id) ON DELETE CASCADE,
    email_notifications boolean NOT NULL DEFAULT true,
    purchase_notifications boolean NOT NULL DEFAULT true,
    sale_notifications boolean NOT NULL DEFAULT true,
    marketing_updates boolean NOT NULL DEFAULT false,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_notification_settings ENABLE ROW LEVEL SECURITY;

-- SELECT policy: merchant can read only their own row
CREATE POLICY "Merchants can view their own notification settings"
ON public.merchant_notification_settings
FOR SELECT
TO authenticated
USING (
    merchant_id IN (
        SELECT id FROM public.merchants WHERE user_id = auth.uid()
    )
);

-- INSERT policy: merchant can insert their own row
CREATE POLICY "Merchants can insert their own notification settings"
ON public.merchant_notification_settings
FOR INSERT
TO authenticated
WITH CHECK (
    merchant_id IN (
        SELECT id FROM public.merchants WHERE user_id = auth.uid()
    )
);

-- UPDATE policy: merchant can update their own row
CREATE POLICY "Merchants can update their own notification settings"
ON public.merchant_notification_settings
FOR UPDATE
TO authenticated
USING (
    merchant_id IN (
        SELECT id FROM public.merchants WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    merchant_id IN (
        SELECT id FROM public.merchants WHERE user_id = auth.uid()
    )
);

-- Grant access to service_role (Admin Client uses this)
GRANT ALL ON public.merchant_notification_settings TO service_role;
GRANT ALL ON public.merchant_notification_settings TO postgres;
