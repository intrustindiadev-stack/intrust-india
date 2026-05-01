-- Adds a UNIQUE constraint on user_channel_bindings(user_id)
-- Required for the upsert in /api/webhooks/omniflow/route.js (onConflict: 'user_id')
-- to correctly UPDATE existing rows instead of inserting duplicates.

ALTER TABLE public.user_channel_bindings
  ADD CONSTRAINT user_channel_bindings_user_id_key UNIQUE (user_id);
