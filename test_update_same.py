import requests
import json
with open('.env.local') as f:
    env_vars = dict(line.strip().split('=', 1) for line in f if '=' in line and not line.startswith('#'))

URL = env_vars['NEXT_PUBLIC_SUPABASE_URL']
SERVICE_KEY = env_vars['SUPABASE_SERVICE_ROLE_KEY']

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

uid = '134c340f-e730-41e6-b5e8-16253c333bcf'
res = requests.patch(f"{URL}/rest/v1/user_profiles?id=eq.{uid}", headers=headers, json={'phone': '+916232809899', 'address': 'awadhpuri, bhopal, mp, 123456'})
print(res.status_code)
print(json.dumps(res.json(), indent=2))
