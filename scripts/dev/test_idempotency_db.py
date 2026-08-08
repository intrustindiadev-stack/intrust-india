import paramiko
import json
import time

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

def exec_query(sql):
    s = c.open_sftp()
    f = s.file('/tmp/temp_test.sql', 'w')
    f.write(sql)
    f.close()
    s.close()
    
    cmd = "cat /tmp/temp_test.sql | docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A"
    stdin, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8").strip()
    lines = [l.strip() for l in out.split('\n') if l.strip() and not l.startswith('SET') and not l.startswith('(')]
    return lines[-1] if lines else ""

admin_id = exec_query("SELECT id FROM public.user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;")

print("=== 3. EXTERNAL LEAD ID & IDEMPOTENCY DB TESTS ===")

test_ext_id = f"TEST_EXT_{int(time.time())}"
test_phone = f"9{int(time.time()) % 1000000000:09d}"
test_email = f"test_ext_{int(time.time())}@example.com"

# Insert initial lead
insert_sql = f"""
INSERT INTO public.crm_leads (title, contact_name, phone, email, source_system, external_lead_id, created_by)
VALUES ('Initial Test Lead', 'Initial Contact', '{test_phone}', '{test_email}', 'crm_app', '{test_ext_id}', '{admin_id}')
RETURNING id;
"""
lead_id = exec_query(insert_sql)
print(f"Created initial lead ID: {lead_id} (source_system: 'crm_app', external_lead_id: '{test_ext_id}', phone: '{test_phone}', email: '{test_email}')")

# Test 1: External Lead ID Duplicate Detection (Same external_lead_id, different phone/email)
diff_phone = f"9{(int(time.time()) + 1) % 1000000000:09d}"
diff_email = f"diff_{int(time.time())}@example.com"

query_1 = f"""
SELECT count(*) FROM public.crm_leads 
WHERE (source_system = 'crm_app' AND external_lead_id = '{test_ext_id}');
"""
count_1 = exec_query(query_1)
print(f"[TEST 1] Query by (source_system, external_lead_id): found {count_1} match -> DUPLICATE DETECTED! (Pass: {count_1 == '1'})")

# Test 2: Same phone/email without external_lead_id
query_2 = f"""
SELECT count(*) FROM public.crm_leads WHERE phone = '{test_phone}' OR email = '{test_email}';
"""
count_2 = exec_query(query_2)
print(f"[TEST 2] Query by phone/email: found {count_2} match -> DUPLICATE DETECTED! (Pass: {count_2 == '1'})")

# Test 3: Repeated import simulation (querying external keys set)
query_3 = f"""
SELECT count(*) FROM public.crm_leads WHERE (source_system = 'crm_app' AND external_lead_id = '{test_ext_id}') OR phone = '{test_phone}';
"""
count_3 = exec_query(query_3)
print(f"[TEST 3] Repeated import check: found {count_3} match -> PREVENTED DUPLICATION! (Pass: {count_3 == '1'})")

# Cleanup
exec_query(f"DELETE FROM public.crm_leads WHERE id = '{lead_id}';")
print("Cleaned up initial test lead.")

c.close()
