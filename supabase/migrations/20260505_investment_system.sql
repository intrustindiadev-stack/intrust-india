-- Create Investment Request Table
CREATE TABLE IF NOT EXISTS merchant_investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'rejected')),
    description TEXT,
    admin_id UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Investment Orders Table (Fake orders fed by admin)
CREATE TABLE IF NOT EXISTS merchant_investment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investment_id UUID NOT NULL REFERENCES merchant_investments(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    order_details TEXT NOT NULL,
    amount_paise BIGINT NOT NULL,
    profit_paise BIGINT NOT NULL, -- The portion of return for the merchant
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE merchant_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_investment_orders ENABLE ROW LEVEL SECURITY;

-- Policies for merchant_investments
CREATE POLICY "Admins can manage all investments"
ON merchant_investments
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Merchants can view their own investments"
ON merchant_investments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM merchants
        WHERE merchants.id = merchant_investments.merchant_id
        AND merchants.user_id = auth.uid()
    )
);

CREATE POLICY "Merchants can create investment requests"
ON merchant_investments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM merchants
        WHERE merchants.id = merchant_id
        AND merchants.user_id = auth.uid()
    )
);

-- Policies for merchant_investment_orders
CREATE POLICY "Admins can manage all investment orders"
ON merchant_investment_orders
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Merchants can view their investment orders"
ON merchant_investment_orders
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM merchants
        WHERE merchants.id = merchant_investment_orders.merchant_id
        AND merchants.user_id = auth.uid()
    )
);
