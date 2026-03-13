-- Allow service_role (admin API) to read all udhari requests
CREATE POLICY "service_role_read_udhari_requests"
  ON public.udhari_requests FOR SELECT
  USING (auth.role() = 'service_role');

-- Allow service_role to read all merchant udhari settings
CREATE POLICY "service_role_read_udhari_settings"
  ON public.merchant_udhari_settings FOR SELECT
  USING (auth.role() = 'service_role');
