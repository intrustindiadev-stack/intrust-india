-- Allow authenticated users to read udhari settings
CREATE POLICY "Allow authenticated users to read udhari settings"
ON merchant_udhari_settings
FOR SELECT
TO authenticated
USING (true);
