-- Create invoice status enum
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'VOID');

-- Create invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    seller_snapshot JSONB NOT NULL,
    customer_snapshot JSONB NOT NULL,
    items_snapshot JSONB NOT NULL,
    subtotal_paise BIGINT NOT NULL CHECK (subtotal_paise >= 0),
    discount_paise BIGINT DEFAULT 0 CHECK (discount_paise >= 0),
    tax_paise BIGINT DEFAULT 0 CHECK (tax_paise >= 0),
    grand_total_paise BIGINT NOT NULL CHECK (grand_total_paise >= 0),
    amount_paid_paise BIGINT DEFAULT 0 CHECK (amount_paid_paise >= 0),
    currency TEXT DEFAULT 'INR',
    status invoice_status DEFAULT 'ISSUED',
    public_payment_token TEXT UNIQUE NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for public lookup
CREATE INDEX idx_invoices_public_token ON public.invoices(public_payment_token);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at_trigger
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_invoices_updated_at();

-- RLS Policies
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow public to select by token (anonymously) for the payment page
CREATE POLICY "Allow public select by token"
    ON public.invoices
    FOR SELECT
    USING (true);

-- Allow authenticated admins and crm users to manage invoices
CREATE POLICY "Allow CRM/Admin manage invoices"
    ON public.invoices
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM user_profiles
            WHERE role IN ('admin', 'super_admin', 'crm_agent', 'crm_manager')
        )
    );
