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

remaining_uids = [
    '5732751f-1580-4013-b4c2-01ea759dee84'
]

for uid in remaining_uids:
    print(f"Deleting dependencies for {uid}")
    # leave_requests
    requests.delete(f'{URL}/rest/v1/leave_requests?hr_reviewed_by=eq.{uid}', headers=headers)
    requests.delete(f'{URL}/rest/v1/leave_requests?employee_id=eq.{uid}', headers=headers)

deleted_count = 0
for uid in remaining_uids:
    r_del = requests.delete(f'{URL}/auth/v1/admin/users/{uid}', headers=headers)
    if r_del.status_code == 200:
        deleted_count += 1
        print(f"Success deleting {uid}")
    else:
        print(f"Failed {uid}:", r_del.text)

print(f"Deleted {deleted_count} remaining test users.")
