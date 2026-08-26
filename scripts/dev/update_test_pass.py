import requests, os
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

email = 'deepaksinghraghuwanshi42@gmail.com'
r = requests.get(f'{URL}/auth/v1/admin/users', headers=headers)
users = r.json().get('users', [])
target = next((u for u in users if u.get('email') == email), None)

if target:
    r = requests.put(f"{URL}/auth/v1/admin/users/{target['id']}", headers=headers, json={"password": "TestPass@123"})
    print("Password updated." if r.status_code == 200 else r.text)
else:
    print("User not found.")
