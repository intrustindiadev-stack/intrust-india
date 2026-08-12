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

if not target_user:
    print(f"User {email} not found.")
else:
    print(f"User found: {target_user['id']}")
    print(f"Email confirmed at: {target_user.get('email_confirmed_at')}")
    print(f"Last sign in at: {target_user.get('last_sign_in_at')}")
    
    # check suspension
    r_prof = requests.get(f"{URL}/rest/v1/user_profiles?id=eq.{target_user['id']}&select=is_suspended,is_active,role", headers=headers)
    if r_prof.status_code == 200:
        print("Profile:", r_prof.json())
    
    # Let's activate them
    updates = {}
    if not target_user.get('email_confirmed_at'):
        updates['email_confirm'] = True
    
    if updates:
        requests.put(f"{URL}/auth/v1/admin/users/{target_user['id']}", headers=headers, json=updates)
        print("Email confirmed.")
        
    requests.patch(f"{URL}/rest/v1/user_profiles?id=eq.{target_user['id']}", headers=headers, json={"is_suspended": False, "is_active": True})
    print("User profile set to active/unsuspended.")

