INSERT INTO platform_settings (key, value)
VALUES 
  ('delivery_fee_paise', '9900'),
  ('min_order_value_paise', '49900')
ON CONFLICT (key) DO NOTHING;
