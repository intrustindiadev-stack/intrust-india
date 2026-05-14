UPDATE reward_configuration 
SET config_value = '"instant"' 
WHERE config_key = 'redemption_mode' 
  AND config_value::text NOT IN ('"instant"', '"approval_required"');

ALTER TABLE reward_configuration 
ADD CONSTRAINT chk_redemption_mode_value 
CHECK (
  (config_key <> 'redemption_mode') 
  OR (config_value::text IN ('"instant"', '"approval_required"'))
);
