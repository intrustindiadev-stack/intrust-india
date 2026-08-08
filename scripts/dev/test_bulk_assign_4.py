import paramiko

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
merchant_id = exec_query("SELECT id FROM public.user_profiles WHERE role='merchant' LIMIT 1;")

# Test 1: Non-existent rep
sql_1 = f"""
PERFORM set_config('request.jwt.claim.sub', '{admin_id}', true);
SELECT public.crm_bulk_assign_leads(ARRAY['00000000-0000-0000-0000-000000000000'::uuid], '00000000-0000-0000-0000-000000000000'::uuid);
"""
res_1 = exec_query(f"DO $$ BEGIN {sql_1} END $$;")

# Direct query using psql
s = c.open_sftp()
f = s.file('/tmp/temp_test1.sql', 'w')
f.write(f"SELECT set_config('request.jwt.claim.sub', '{admin_id}', false);\nSELECT public.crm_bulk_assign_leads(ARRAY['00000000-0000-0000-0000-000000000000'::uuid], '00000000-0000-0000-0000-000000000000'::uuid);")
f.close()

cmd = "cat /tmp/temp_test1.sql | docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A"
stdin, stdout, stderr = c.exec_command(cmd)
print("Test 1 (Non-existent rep):", stdout.read().decode("utf-8").strip().split('\n')[-1])

f = s.file('/tmp/temp_test2.sql', 'w')
f.write(f"SELECT set_config('request.jwt.claim.sub', '{admin_id}', false);\nSELECT public.crm_bulk_assign_leads(ARRAY['00000000-0000-0000-0000-000000000000'::uuid], '{merchant_id}'::uuid);")
f.close()

cmd = "cat /tmp/temp_test2.sql | docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A"
stdin, stdout, stderr = c.exec_command(cmd)
print("Test 2 (Non-CRM role rep):", stdout.read().decode("utf-8").strip().split('\n')[-1])

c.close()
