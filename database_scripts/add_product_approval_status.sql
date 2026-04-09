-- Step 1: Add columns to shopping_products
ALTER TABLE shopping_products
ADD COLUMN approval_status text NOT NULL DEFAULT 'live' CHECK (approval_status IN ('draft', 'pending_approval', 'live', 'rejected')),
ADD COLUMN rejection_reason text,
ADD COLUMN submitted_by_merchant_id uuid REFERENCES merchants(id);

-- Step 2: Create Index for faster queries on admin queue
CREATE INDEX idx_shopping_products_approval_status ON shopping_products(approval_status) WHERE deleted_at IS NULL;
