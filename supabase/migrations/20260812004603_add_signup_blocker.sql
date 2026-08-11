-- Add a trigger to block malicious hacker emails from signing up

CREATE OR REPLACE FUNCTION auth.block_malicious_signups()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IN (
        'lixtanpro@gmail.com', 
        'g.flymc@gmail.com', 
        'jeannettoyer@gmail.com', 
        'qrcodesnt@gmail.com'
    ) THEN
        RAISE EXCEPTION 'Signup blocked for security reasons.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_block_malicious_signups ON auth.users;
CREATE TRIGGER trg_block_malicious_signups
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.block_malicious_signups();
