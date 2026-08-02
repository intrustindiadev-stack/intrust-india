-- Fix sync_user_to_crm trigger to use 'user' role instead of 'customer'
-- which caused new user signups to fail to create a user_profiles record

CREATE OR REPLACE FUNCTION sync_user_to_crm()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Try to find an admin to assign created_by
    SELECT id INTO admin_id FROM user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    IF admin_id IS NULL THEN
        admin_id := NEW.id; -- fallback
    END IF;

    -- Only sync users (role was renamed from customer to user)
    IF NEW.role::text = 'user' THEN
        -- Deduplicate on email (when email is not NULL) OR on phone (when phone is not NULL)
        IF NOT EXISTS (
            SELECT 1 FROM crm_leads
            WHERE
                (NEW.email IS NOT NULL AND email = NEW.email)
                OR
                (NEW.phone IS NOT NULL AND phone = NEW.phone)
        ) THEN
            INSERT INTO crm_leads (
                title,
                contact_name,
                phone,
                email,
                source,
                status,
                assigned_to,
                created_by
            ) VALUES (
                NEW.full_name || ' (User)',
                NEW.full_name,
                NEW.phone,
                NEW.email,
                'Users',
                'new',
                NULL,
                admin_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
