import requests
import os
import time

env_vars = {}
with open('.env.local') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env_vars[k] = v.strip('\'"')

URL = env_vars['NEXT_PUBLIC_SUPABASE_URL']
ANON_KEY = env_vars['NEXT_PUBLIC_SUPABASE_ANON_KEY']
SERVICE_KEY = env_vars['SUPABASE_SERVICE_ROLE_KEY']

anon_headers = {
    'apikey': ANON_KEY,
    'Content-Type': 'application/json'
}

service_headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# 1. Login
uid = '3b531e27-ae28-4424-b303-937e060c536d'
password = 'TestPass@123'
print("Logging in...")
res = requests.post(f"{URL}/auth/v1/token?grant_type=password", headers=anon_headers, json={'email': 'deepaksinghraghuwanshi42@gmail.com', 'password': password})
if res.status_code != 200:
    print("Auth error:", res.text)
    exit(1)

token = res.json()['access_token']

# 2. Call draft_cart_orders
auth_headers = {
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}
print("Calling draft_cart_orders...")
res = requests.post(f"{URL}/rest/v1/rpc/draft_cart_orders", headers=auth_headers, json={'p_customer_id': uid})
if res.status_code != 200:
    print("Draft error:", res.text)
    exit(1)

draft = res.json()
print("Draft created:", draft)

# 3. Call SabPaisa Initiate API
print("Calling SabPaisa initiate API...")
res = requests.post('http://localhost:3000/api/sabpaisa/initiate', headers=auth_headers, json={
    'clientTxnId': f"txn_{int(time.time())}",
    'amount': draft['total_paise'] / 100.0,
    'payerEmail': 'deepaksinghraghuwanshi42@gmail.com',
    'payerMobile': '9876543210',
    'udf1': 'CART_CHECKOUT',
    'udf2': draft['group_id']
})

print("SabPaisa API Status:", res.status_code)
if res.status_code == 200:
    print("SabPaisa API Response:", res.json())
    print("E2E TEST PASSED: SabPaisa successfully reached!")
else:
    print("SabPaisa API Error:", res.text)

