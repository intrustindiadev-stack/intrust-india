-- ==========================================
-- Date: 2026-05-10
-- Description: Enable realtime for reward_transactions and set replica identity.
-- Ticket Reference: 4c157fd8-1ea3-4726-8132-c9e5ef9b5f5d
-- Audit Spec Reference: §4 / §6
-- ==========================================

DO $BEGIN$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_transactions;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $BEGIN$;

ALTER TABLE public.reward_transactions REPLICA IDENTITY FULL;

-- Verification queries:
-- Expect 1 row:
-- SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='reward_transactions';
-- Expect 'f':
-- SELECT relreplident FROM pg_class WHERE relname='reward_transactions';

-- MIGRATION COMPLETE
