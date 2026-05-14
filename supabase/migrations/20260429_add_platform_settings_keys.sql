INSERT INTO platform_settings (key, value, description)
VALUES 
  ('business_email', 'info@intrustindia.com', 'Primary business contact email'),
  ('business_website', 'www.intrustindia.com', 'Official business website'),
  ('notification_email_alerts', 'true', 'Receive critical system updates via email'),
  ('notification_sms_alerts', 'false', 'Receive urgent notifications via SMS'),
  ('security_2fa_enabled', 'false', 'Require 2FA for admin accounts')
ON CONFLICT (key) DO NOTHING;
