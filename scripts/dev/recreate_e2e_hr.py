import requests
import os
import time

env_vars = {}
with open('../../.env.local') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env_vars[k] = v.strip('\'"')

URL = env_vars['NEXT_PUBLIC_SUPABASE_URL']
SERVICE_KEY = env_vars['SUPABASE_SERVICE_ROLE_KEY']

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json'
}

accounts = [
    {'email': 'e2e.hr2@intrust-test.com', 'password': 'SecurePass123!', 'name': 'E2E HR2'},
    {'email': 'e2e.hr3@intrust-test.com', 'password': 'SecurePass123!', 'name': 'E2E HR3'}
]

for acc in accounts:
    # Create user
    print(f"Creating user {acc['email']}...")
    r = requests.post(
        f'{URL}/auth/v1/admin/users', 
        headers=headers, 
        json={
            'email': acc['email'], 
            'password': acc['password'],
            'email_confirm': True,
            'user_metadata': {'full_name': acc['name'], 'role': 'hr_manager'}
        }
    )
    if r.status_code in [200, 201]:
        user_id = r.json()['id']
        print(f"Created user {user_id}. Waiting for trigger...")
        time.sleep(1)
        
        # Update user_profiles role
        requests.patch(
            f'{URL}/rest/v1/user_profiles?id=eq.{user_id}', 
            headers=headers, 
            json={'role': 'hr_manager', 'full_name': acc['name']}
        )
        print("Role updated.")
    else:
        print(f"Failed to create user {acc['email']}: {r.text}")

print("Done.")
