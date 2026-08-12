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

user_id = 'd29ca56d-1c56-4477-8dca-c8f47604f377'

# Unban the user via GoTrue Admin API
payload = {
    "ban_duration": "none"
}
r = requests.put(f"{URL}/auth/v1/admin/users/{user_id}", headers=headers, json=payload)
if r.status_code == 200:
    print("User successfully unlocked.")
else:
    print("Failed to unlock user:", r.text)

