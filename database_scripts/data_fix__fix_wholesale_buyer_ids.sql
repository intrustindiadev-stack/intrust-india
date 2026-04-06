-- Data Correction Script
-- Fixes wholesale purchases in shopping_orders that were erroneously logged with the user_id instead of the merchant_id

UPDATE public.shopping_orders so
SET buyer_id = m.id
FROM public.merchants m
WHERE so.buyer_id = m.user_id
  AND so.order_type = 'wholesale'
  AND so.buyer_type = 'merchant'
  AND so.status = 'completed';
