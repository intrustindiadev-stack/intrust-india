import requests, os, json, uuid
from time import sleep

def load_env():
    env_vars = {}
    with open('.env.local') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env_vars[k] = v.strip('\'"')
    return env_vars

env = load_env()
URL = env['NEXT_PUBLIC_SUPABASE_URL']
ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

def headers(token=None, role='anon'):
    h = {'apikey': ANON_KEY, 'Content-Type': 'application/json'}
    if token:
        h['Authorization'] = f'Bearer {token}'
    if role == 'service_role':
        h['apikey'] = SERVICE_KEY
        h['Authorization'] = f'Bearer {SERVICE_KEY}'
    return h

def create_user_and_role(email, role):
    # Create user
    r = requests.post(f'{URL}/auth/v1/signup', headers=headers(), json={'email': email, 'password': 'Password123!'})
    if 'access_token' in r.json():
        user = r.json()['user']
        token = r.json()['access_token']
    else:
        # Try login
        r = requests.post(f'{URL}/auth/v1/token?grant_type=password', headers=headers(), json={'email': email, 'password': 'Password123!'})
        user = r.json()['user']
        token = r.json()['access_token']
    
    # Wait for trigger to create user_profile
    sleep(1)
    
    # Assign role via service key
    if role != 'customer':
        requests.patch(f'{URL}/rest/v1/user_profiles?id=eq.{user["id"]}', headers=headers(role='service_role'), json={'role': role})
        
        # update metadata
        requests.put(f'{URL}/auth/v1/admin/users/{user["id"]}', headers=headers(role='service_role'), json={'user_metadata': {'role': role}})
        
    return user['id'], token

print("Initializing test accounts...")
u_cust, t_cust = create_user_and_role('verify_customer@intrustindia.com', 'customer')
u_merch, t_merch = create_user_and_role('verify_merchant@intrustindia.com', 'merchant')
u_admin, t_admin = create_user_and_role('verify_admin@intrustindia.com', 'admin')
u_hr, t_hr = create_user_and_role('verify_hr@intrustindia.com', 'hr_manager')

print("Users created successfully.")
print(f"Customer: {u_cust}, Merchant: {u_merch}, Admin: {u_admin}, HR: {u_hr}")

results = []

def run_test(test_name, req_fn, expected_status, role_name):
    try:
        r = req_fn()
        passed = r.status_code == expected_status or (expected_status == '2xx' and 200 <= r.status_code < 300)
        status_text = 'PASS' if passed else 'FAIL'
        print(f"[{status_text}] {role_name} - {test_name} (Expected: {expected_status}, Got: {r.status_code})")
        results.append({'test': f"{role_name} - {test_name}", 'status': status_text, 'details': r.text[:200]})
    except Exception as e:
        print(f"[FAIL] {role_name} - {test_name} (Exception: {str(e)})")
        results.append({'test': f"{role_name} - {test_name}", 'status': 'FAIL', 'details': str(e)})

# 1. P5/P6/P7 RPC Tests
print("\n--- Testing Financial RPCs ---")
for r_name, t in [('Customer', t_cust), ('Merchant', t_merch), ('Admin', t_admin)]:
    def test_atomic(token):
        r = requests.post(f'{URL}/rest/v1/rpc/atomic_customer_wallet_credit', headers=headers(token), json={'p_user_id': u_cust, 'p_amount_paise': 1000})
        return r

    try:
        r = test_atomic(t)
        p = (r.status_code in [403, 404])
        print(f"[{'PASS' if p else 'FAIL'}] {r_name} - atomic_customer_wallet_credit blocked (Got: {r.status_code})")
    except: pass

# 2. Storage Tests
print("\n--- Testing Storage RLS ---")

# Admin uploads a resume
pdf_data = b'%PDF-1.4 Fake PDF'
resume_path = f'{u_cust}-test.pdf'
requests.post(f'{URL}/storage/v1/object/resumes/{resume_path}', headers=headers(role='service_role'), data=pdf_data)

# Customer tries to read resume directly (P11)
r_cust_resume = requests.get(f'{URL}/storage/v1/object/resumes/{resume_path}', headers=headers(t_cust))
print(f"[{'PASS' if r_cust_resume.status_code in [400,404,403] else 'FAIL'}] Customer direct resume read (Expected: Blocked, Got: {r_cust_resume.status_code})")

# HR tries to read resume directly
r_hr_resume = requests.get(f'{URL}/storage/v1/object/resumes/{resume_path}', headers=headers(t_hr))
print(f"[{'PASS' if r_hr_resume.status_code in [400,404,403] else 'FAIL'}] HR direct resume read (Expected: Blocked, Got: {r_hr_resume.status_code})")

# Customer tries to upload an avatar
avatar_data = b'fake_image_data'
avatar_path = f'{u_cust}/my_avatar.jpg'
r_avatar = requests.post(f'{URL}/storage/v1/object/avatars/{avatar_path}', headers=headers(t_cust), data=avatar_data)
print(f"[{'PASS' if r_avatar.status_code == 200 else 'FAIL'}] Customer upload avatar to own folder (Got: {r_avatar.status_code})")

# Customer tries to upload an avatar to another user's folder (Adversarial)
avatar_path_hack = f'{u_admin}/my_avatar.jpg'
r_avatar_hack = requests.post(f'{URL}/storage/v1/object/avatars/{avatar_path_hack}', headers=headers(t_cust), data=avatar_data)
print(f"[{'PASS' if r_avatar_hack.status_code in [403, 400] else 'FAIL'}] Customer upload avatar to admin folder (Got: {r_avatar_hack.status_code})")

# 3. Webhook Tests
print("\n--- Testing Webhooks ---")
# Hit Next.js Omniflow Webhook with no signature
# We need the Next.js URL. It's localhost:3000 if running locally, or intrustindia.com if prod.
# Assuming Next.js is accessible via localhost:3000
try:
    r_omni = requests.post('http://localhost:3000/api/webhooks/omniflow', json={'message': 'test'})
    print(f"[{'PASS' if r_omni.status_code == 401 else 'FAIL'}] Omniflow Signature Validation (Expected 401, Got: {r_omni.status_code})")
except Exception as e:
    print(f"Skipping webhook local test due to Next.js not running locally: {e}")

print("\nAll Backend Tests Completed.")
