-- Migration: add 'store_credit_payment' to merchant_transactions type constraint
-- Required by: settle_store_credit_for_cart RPC (store_credits_shop_extension.sql)

ALTER TABLE public.merchant_transactions 
  DROP CONSTRAINT IF EXISTS merchant_transactions_transaction_type_check,
  ADD CONSTRAINT merchant_transactions_transaction_type_check 
    CHECK (transaction_type IN ('purchase', 'sale', 'commission', 'wallet_topup', 'withdrawal', 'udhari_payment', 'store_credit_payment'));
