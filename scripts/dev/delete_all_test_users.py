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

test_user_ids = []
for u in users:
    email = u.get('email', '')
    if 'test' in email or 'admin_' in email or 'verify' in email or 'adversary' in email:
        test_user_ids.append(u['id'])

if not test_user_ids:
    print("No test users found.")
    exit(0)

# Delete dependencies
for uid in test_user_ids:
    requests.delete(f'{URL}/rest/v1/crm_leads?created_by=eq.{uid}', headers=headers)
    requests.delete(f'{URL}/rest/v1/crm_leads?assigned_to=eq.{uid}', headers=headers)
    requests.delete(f'{URL}/storage/v1/object/avatars/{uid}/my_avatar.jpg', headers=headers)

deleted_count = 0
for uid in test_user_ids:
    r_del = requests.delete(f'{URL}/auth/v1/admin/users/{uid}', headers=headers)
    if r_del.status_code == 200:
        deleted_count += 1
        print(f"Success deleting {uid}")
    else:
        print(f"Failed {uid}:", r_del.text)

print(f"Deleted {deleted_count} test users.")
