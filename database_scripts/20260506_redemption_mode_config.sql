-- Seed redemption_mode config key for the reward point system
-- Controls whether point conversions are instant or require admin approval
INSERT INTO reward_configuration (config_key, config_value, config_type, description, is_active)
VALUES (
    'redemption_mode',
    '"instant"',
    'global',
    'Controls whether point conversions are instant or require admin approval. Values: instant | approval_required',
    true
)
ON CONFLICT (config_key) DO NOTHING;