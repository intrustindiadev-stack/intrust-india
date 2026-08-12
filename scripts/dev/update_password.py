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

email = 'ayushmalviya824@gmail.com'

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

target_user = None
for u in users:
    if u.get('email') == email:
        target_user = u
        break

if target_user:
    new_password = 'Ayush@2030'
    r = requests.put(f"{URL}/auth/v1/admin/users/{target_user['id']}", headers=headers, json={"password": new_password})
    if r.status_code == 200:
        print(f"Password updated to {new_password}")
    else:
        print("Error:", r.text)

