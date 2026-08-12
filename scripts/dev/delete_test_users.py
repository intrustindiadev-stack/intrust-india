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

test_emails = [
    'verify_customer@intrustindia.com',
    'verify_merchant@intrustindia.com',
    'verify_admin@intrustindia.com',
    'verify_hr@intrustindia.com',
    'adversary_test@intrustindia.com',
    'adversary_test_v2@intrustindia.com'
]

# Get users
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

user_ids = [u['id'] for u in users if u['email'] in test_emails]
if not user_ids:
    print("No test users found.")
    exit(0)

# Delete dependencies using rest/v1
for uid in user_ids:
    print(f"Deleting CRM leads created by {uid}")
    requests.delete(f'{URL}/rest/v1/crm_leads?created_by=eq.{uid}', headers=headers)
    
    print(f"Deleting CRM leads assigned to {uid}")
    requests.delete(f'{URL}/rest/v1/crm_leads?assigned_to=eq.{uid}', headers=headers)
    
    print(f"Deleting storage objects for {uid}")
    requests.delete(f'{URL}/storage/v1/object/avatars/{uid}/my_avatar.jpg', headers=headers)

# Try deleting users again
deleted_count = 0
for u in users:
    if u['email'] in test_emails:
        print(f"Deleting user {u['email']} ({u['id']})")
        r_del = requests.delete(f'{URL}/auth/v1/admin/users/{u["id"]}', headers=headers)
        if r_del.status_code == 200:
            deleted_count += 1
            print("Success")
        else:
            print("Failed:", r_del.text)

print(f"Deleted {deleted_count} test users.")
