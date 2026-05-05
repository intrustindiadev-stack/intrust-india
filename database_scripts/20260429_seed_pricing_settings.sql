-- Seed dynamic pricing keys into platform_settings
-- Uses ON CONFLICT DO NOTHING so existing deployments are not overwritten.

INSERT INTO platform_settings (key, value, updated_at)
VALUES
    ('merchant_sub_price_1m',     '499',  NOW()),
    ('merchant_sub_price_6m',     '1999', NOW()),
    ('merchant_sub_price_12m',    '3999', NOW()),
    ('auto_mode_price_first',     '999',  NOW()),
    ('auto_mode_price_renewal',   '1999', NOW())
ON CONFLICT (key) DO NOTHING;
