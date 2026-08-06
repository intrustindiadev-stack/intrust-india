INSERT INTO user_profiles (id, full_name, email, role, created_at, updated_at)
SELECT DISTINCT ON (ca.user_id)
    ca.user_id,
    COALESCE(ca.full_name, 'New Hire'),
    ca.email,
    'employee'::user_role,
    now(),
    now()
FROM career_applications ca
INNER JOIN auth.users au ON au.id = ca.user_id
WHERE ca.user_id IS NOT NULL 
  AND ca.status = 'hired'
  AND NOT EXISTS (
      SELECT 1 FROM user_profiles up WHERE up.id = ca.user_id
  )
ON CONFLICT (id) DO NOTHING;
