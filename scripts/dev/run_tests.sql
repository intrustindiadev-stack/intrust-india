\echo '--- Test Setup: DEV_FINAL receives a unique service area ---'
BEGIN;
-- Give DEV_FINAL coverage for 'faketestcity'
INSERT INTO public.team_service_areas (team_id, area_type, value, city) 
VALUES ('2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef', 'city', 'faketestcity', 'faketestcity');

\echo '--- Test 1: Test Team Isolation (DEV_FINAL ignored) ---'
-- Insert a lead for 'faketestcity'
INSERT INTO public.crm_leads (title, contact_name, phone, city, created_by) 
VALUES ('Test Lead Fake', 'Test', '9999911111', 'faketestcity', (SELECT id FROM auth.users LIMIT 1)) 
RETURNING id, assigned_team_id, routing_status;

\echo '--- Test 2: Production Routing (AASHIMA matches Bhopal) ---'
INSERT INTO public.crm_leads (title, contact_name, phone, city, created_by) 
VALUES ('Test Lead Prod', 'Test', '9999922222', 'bhopal', (SELECT id FROM auth.users LIMIT 1)) 
RETURNING id, assigned_team_id, routing_status;

\echo '--- Test 3: Location Normalization (Empty Strings) ---'
INSERT INTO public.crm_leads (title, contact_name, phone, city, created_by) 
VALUES ('Test Empty City', 'Test', '9999933333', '   ', (SELECT id FROM auth.users LIMIT 1)) 
RETURNING id, city, assigned_team_id, routing_status;

ROLLBACK;

\echo '--- Test 4: 9,501 Production Data Safety Audit ---'
SELECT 
    count(*) as total,
    count(CASE WHEN assigned_team_id = '630fa633-dcc0-4209-afbf-de8c0bf9b0dd' THEN 1 END) as aashima,
    count(CASE WHEN assigned_to IS NULL THEN 1 END) as team_pool,
    count(CASE WHEN routing_status = 'auto_matched' THEN 1 END) as auto_matched
FROM public.crm_leads 
WHERE city_norm = 'bhopal' AND created_at < '2026-08-10'::timestamp AND source != 'Merchants';
