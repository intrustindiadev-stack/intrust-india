-- Migration: 20260909_ai_orders_reject.sql
-- Description: Add rejection_reason to ai_orders table

ALTER TABLE public.ai_orders
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
