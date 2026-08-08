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
    lines = [l for l in out.split('\n') if l.strip() and not l.startswith('(')]
    return lines[0] if lines else ""

admin_id = exec_query("SELECT id FROM public.user_profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;")
merchant_id = exec_query("SELECT id FROM public.user_profiles WHERE role='merchant' LIMIT 1;")
print(f"Using Admin ID: {admin_id}, Merchant ID: {merchant_id}")

print("\n=== 6. BULK ASSIGNMENT TESTS WITH AUTH SIMULATION ===")

# Test 1: Non-existent rep
sql_1 = f"""
SET LOCAL request.jwt.claim.sub = '{admin_id}';
SELECT public.crm_bulk_assign_leads(ARRAY['00000000-0000-0000-0000-000000000000'::uuid], '00000000-0000-0000-0000-000000000000'::uuid);
"""
res_1 = exec_query(sql_1)
print("Test 1 (Non-existent rep):", res_1)

# Test 2: User with non-CRM role
sql_2 = f"""
SET LOCAL request.jwt.claim.sub = '{admin_id}';
SELECT public.crm_bulk_assign_leads(ARRAY['00000000-0000-0000-0000-000000000000'::uuid], '{merchant_id}'::uuid);
"""
res_2 = exec_query(sql_2)
print("Test 2 (Non-CRM role rep):", res_2)

# Test 3: Synchronization test
sql_3 = f"""
DO $$
DECLARE
    v_lead_id UUID;
    v_new_team UUID;
    v_rep_team UUID;
    v_res JSONB;
BEGIN
    PERFORM set_config('request.jwt.claim.sub', '{admin_id}', true);

    INSERT INTO public.crm_leads (title, contact_name, created_by)
    VALUES ('Bulk Assign Sync Test', 'Sync Contact', '{admin_id}')
    RETURNING id INTO v_lead_id;

    SELECT public.crm_bulk_assign_leads(ARRAY[v_lead_id], '{admin_id}') INTO v_res;

    SELECT l.assigned_team_id, u.team_id 
    INTO v_new_team, v_rep_team 
    FROM public.crm_leads l 
    JOIN public.user_profiles u ON u.id = '{admin_id}'
    WHERE l.id = v_lead_id;
    
    RAISE NOTICE 'SYNC_TEST: res=% lead_team=% rep_team=%', v_res, v_new_team, v_rep_team;

    DELETE FROM public.crm_leads WHERE id = v_lead_id;
END $$;
"""

s = c.open_sftp()
f = s.file('/tmp/temp_test.sql', 'w')
f.write(sql_3)
f.close()
s.close()

cmd = "cat /tmp/temp_test.sql | docker exec -i supabase-db psql -U supabase_admin -d postgres -A"
stdin, stdout, stderr = c.exec_command(cmd)
err = stderr.read().decode("utf-8").strip()
notice_line = [line for line in err.split('\n') if 'NOTICE:  SYNC_TEST:' in line]
print("Test 3 (Rep assignment & team sync):", notice_line[0] if notice_line else err)

c.close()
