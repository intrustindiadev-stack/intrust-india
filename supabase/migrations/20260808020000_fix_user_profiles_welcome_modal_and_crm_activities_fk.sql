-- Add welcome_celebration_shown to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS welcome_celebration_shown BOOLEAN DEFAULT false;

-- Add foreign key constraint for actor_id in crm_lead_activities
-- If constraint exists, we can drop and recreate or just use DO block

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crm_lead_activities_actor_id_fkey') THEN
        ALTER TABLE crm_lead_activities
        ADD CONSTRAINT crm_lead_activities_actor_id_fkey
        FOREIGN KEY (actor_id) REFERENCES user_profiles(id)
        ON DELETE SET NULL;
    END IF;
END $$;
