-- Enable realtime for Merchant Orders and Transactions
-- Created: 2026-04-22

-- 1. Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_order_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_transactions;

-- 2. Set REPLICA IDENTITY FULL for these tables
-- This ensures that the full row payload is available in the realtime payload, 
-- which is necessary for row-level filtering (e.g. merchant_id=eq.X) in DELETE/UPDATE events.
ALTER TABLE public.shopping_order_groups REPLICA IDENTITY FULL;
ALTER TABLE public.merchant_transactions REPLICA IDENTITY FULL;
