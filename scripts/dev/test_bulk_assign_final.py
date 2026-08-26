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
    
    cmd = "cat /tmp/temp_test.sql | docker exec -i supabase-db psql -U supabase_admin -d postgres -A -t"
    stdin, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8").strip()
    return out

print("=== FINAL BULK ASSIGNMENT VERIFICATION ===")

user_id = exec_query("SELECT id FROM public.user_profiles WHERE role IN ('admin', 'super_admin', 'relationship_manager') LIMIT 1;").split('\n')[-1]
rep_id = exec_query("SELECT id FROM public.user_profiles WHERE role IN ('relationship_manager', 'relationship_exec') AND team_id IS NOT NULL LIMIT 1;").split('\n')[-1]

sql = f"""
DO $$
DECLARE
    v_lead_id UUID;
    v_res JSONB;
BEGIN
    -- Set auth.uid() simulation for the session
    PERFORM set_config('request.jwt.claim.sub', '{user_id}', true);
    PERFORM set_config('request.jwt.claims', '{{"sub": "{user_id}"}}', true);

    -- Create test lead
    INSERT INTO public.crm_leads (title, contact_name, created_by)
    VALUES ('Final Verification Lead', 'Verify Contact', '{user_id}')
    RETURNING id INTO v_lead_id;

    -- Assign to rep
    SELECT public.crm_bulk_assign_leads(ARRAY[v_lead_id], '{rep_id}') INTO v_res;

    RAISE NOTICE 'FINAL_SYNC_TEST: %', v_res;

    -- Clean up
    DELETE FROM public.crm_leads WHERE id = v_lead_id;
END $$;
"""

s = c.open_sftp()
f = s.file('/tmp/temp_test_final.sql', 'w')
f.write(sql)
f.close()
s.close()

cmd = "cat /tmp/temp_test_final.sql | docker exec -i supabase-db psql -U supabase_admin -d postgres -A -t"
stdin, stdout, stderr = c.exec_command(cmd)
err = stderr.read().decode("utf-8").strip()
notice_line = [line for line in err.split('\n') if 'NOTICE:  FINAL_SYNC_TEST:' in line]
print("Result:", notice_line[0] if notice_line else err)

c.close()
