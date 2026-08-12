import requests
import os

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

users = []
page = 1
while True:
    r = requests.get(f'{URL}/auth/v1/admin/users?page={page}', headers=headers)
    if r.status_code == 200:
        data = r.json()
        if not data.get('users'):
            break
        users.extend(data['users'])
        page += 1
    else:
        break

test_users = []
for u in users:
    email = u.get('email', '')
    if 'test' in email or 'admin_' in email or 'verify' in email or 'adversary' in email:
        test_users.append(email)

for e in sorted(test_users):
    print(e)
print(f"Total suspected test users: {len(test_users)}")
