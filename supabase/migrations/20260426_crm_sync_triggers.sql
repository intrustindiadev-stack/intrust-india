-- Create a function to auto-sync merchants to CRM leads
CREATE OR REPLACE FUNCTION sync_merchant_to_crm()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
    user_email TEXT;
BEGIN
    -- Try to find an admin to assign created_by
    SELECT id INTO admin_id FROM user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    IF admin_id IS NULL THEN
        admin_id := NEW.user_id; -- fallback
    END IF;

    -- Get email
    SELECT email INTO user_email FROM user_profiles WHERE id = NEW.user_id;

    -- Only insert if not exists (using phone or email as basic check)
    IF NOT EXISTS (SELECT 1 FROM crm_leads WHERE phone = NEW.phone OR (email = user_email AND user_email IS NOT NULL)) THEN
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
            NEW.business_name || ' (Merchant)',
            NEW.business_name,
            NEW.phone,
            user_email,
            'Merchants',
            'new',
            NULL,
            admin_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Merchants
DROP TRIGGER IF EXISTS sync_merchant_trigger ON merchants;
CREATE TRIGGER sync_merchant_trigger
AFTER INSERT ON merchants
FOR EACH ROW EXECUTE FUNCTION sync_merchant_to_crm();

-- Create a function to auto-sync users to CRM leads
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

    -- Only sync if they are a regular customer (not admin/merchant explicitly, though we can just sync everyone)
    IF NEW.role = 'customer' THEN
        -- Only insert if not exists
        IF NOT EXISTS (SELECT 1 FROM crm_leads WHERE email = NEW.email) THEN
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

-- Trigger for Users
DROP TRIGGER IF EXISTS sync_user_trigger ON user_profiles;
CREATE TRIGGER sync_user_trigger
AFTER INSERT ON user_profiles
FOR EACH ROW EXECUTE FUNCTION sync_user_to_crm();

-- BACKFILL EXISTING MERCHANTS
DO $$
DECLARE
    m RECORD;
    admin_id UUID;
    u_email TEXT;
BEGIN
    SELECT id INTO admin_id FROM user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    
    FOR m IN SELECT * FROM merchants LOOP
        SELECT email INTO u_email FROM user_profiles WHERE id = m.user_id;
        IF NOT EXISTS (SELECT 1 FROM crm_leads WHERE phone = m.phone OR (email = u_email AND u_email IS NOT NULL)) THEN
            INSERT INTO crm_leads (title, contact_name, phone, email, source, status, created_by)
            VALUES (m.business_name || ' (Merchant)', m.business_name, m.phone, u_email, 'Merchants', 'new', COALESCE(admin_id, m.user_id));
        END IF;
    END LOOP;
END;
$$;

-- BACKFILL EXISTING USERS
DO $$
DECLARE
    u RECORD;
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    
    FOR u IN SELECT * FROM user_profiles WHERE role = 'customer' LOOP
        IF NOT EXISTS (SELECT 1 FROM crm_leads WHERE email = u.email) THEN
            INSERT INTO crm_leads (title, contact_name, phone, email, source, status, created_by)
            VALUES (u.full_name || ' (User)', u.full_name, u.phone, u.email, 'Users', 'new', COALESCE(admin_id, u.id));
        END IF;
    END LOOP;
END;
$$;
