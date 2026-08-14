BEGIN;
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub": "582d3d78-cf98-46af-86b8-9f133cd55e7a", "role": "authenticated"}', true);
SELECT crm_bulk_assign_leads(ARRAY['b56d6d6b-d007-4dcc-babb-8eb8d349beae']::uuid[], 'e54892d9-7ec3-4a27-8587-23f9379e389b'::uuid) as test_b;
SELECT crm_bulk_assign_leads(ARRAY['b56d6d6b-d007-4dcc-babb-8eb8d349beae']::uuid[], 'fdf0d9d8-9a39-4651-88ee-192145f859c6'::uuid) as test_c;
SELECT crm_bulk_assign_leads(ARRAY['b56d6d6b-d007-4dcc-babb-8eb8d349beae']::uuid[], '6307e2d0-1176-481c-9770-0d093a5b610b'::uuid) as test_d;
SELECT crm_bulk_assign_leads(ARRAY['b56d6d6b-d007-4dcc-babb-8eb8d349beae']::uuid[], '7c07d8e7-dad1-4b46-aa34-1d8f585f6f16'::uuid) as test_e;
ROLLBACK;
