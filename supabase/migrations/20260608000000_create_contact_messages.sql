-- Create the contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'responded', 'archived')),
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  source_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public contact form)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_messages' AND policyname = 'public_insert_contact_messages'
  ) THEN
    CREATE POLICY "public_insert_contact_messages" ON public.contact_messages
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Only admins can view submissions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_messages' AND policyname = 'admin_view_contact_messages'
  ) THEN
    CREATE POLICY "admin_view_contact_messages" ON public.contact_messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Only admins can update (to change status, mark email_sent, etc.)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_messages' AND policyname = 'admin_update_contact_messages'
  ) THEN
    CREATE POLICY "admin_update_contact_messages" ON public.contact_messages
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON public.contact_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON public.contact_messages (status);

-- Table-level GRANTs (required for PostgREST / Supabase client access)
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO service_role, authenticated;
GRANT ALL ON public.contact_messages TO service_role;
