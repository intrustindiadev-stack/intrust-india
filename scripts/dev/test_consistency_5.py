import paramiko
import json

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

user_id = exec_query("SELECT id FROM public.user_profiles WHERE id IS NOT NULL LIMIT 1;")
print("Using created_by user_id:", user_id)

print("\n=== 1. PREVIEW VS EXECUTION CONSISTENCY TEST ===")

test_cases = [
    {"name": "A_pincode", "pincode": "462022"},
    {"name": "B_zone", "zone": "Awadhpuri", "city": "Bhopal"},
    {"name": "C_area", "area": "462022", "city": "bhopal"},
    {"name": "E_state", "state": "Madhya Pradesh"},
    {"name": "F_no_coverage", "city": "NonExistentCity9999"},
    {"name": "G_missing_location"}
]

for idx, tc in enumerate(test_cases):
    loc_json = json.dumps([{"index": idx, "pincode": tc.get("pincode"), "zone": tc.get("zone"), "area": tc.get("area"), "city": tc.get("city"), "state": tc.get("state")}])
    preview_sql = f"SELECT public.crm_bulk_preview_team_for_location('{loc_json}'::jsonb);"
    preview_res = exec_query(preview_sql)
    
    pincode = f"'{tc.get('pincode')}'" if tc.get('pincode') else "NULL"
    zone = f"'{tc.get('zone')}'" if tc.get('zone') else "NULL"
    area = f"'{tc.get('area')}'" if tc.get('area') else "NULL"
    city = f"'{tc.get('city')}'" if tc.get('city') else "NULL"
    state = f"'{tc.get('state')}'" if tc.get('state') else "NULL"

    sql_test = f"""
    DO $$
    DECLARE
        v_lead_id UUID;
        v_team_id UUID;
        v_match_type TEXT;
        v_status TEXT;
    BEGIN
        INSERT INTO public.crm_leads (title, contact_name, pincode, zone, area, city, state, created_by)
        VALUES ('Test {tc["name"]}', 'Test Contact', {pincode}, {zone}, {area}, {city}, {state}, '{user_id}')
        RETURNING id, assigned_team_id, territory_match_type::text, routing_status
        INTO v_lead_id, v_team_id, v_match_type, v_status;

        RAISE NOTICE 'TRIGGER_OUT: team=% match=% status=%', v_team_id, v_match_type, v_status;
        
        -- Clean up immediately
        DELETE FROM public.crm_leads WHERE id = v_lead_id;
    END $$;
    """
    
    s = c.open_sftp()
    f = s.file('/tmp/temp_test.sql', 'w')
    f.write(sql_test)
    f.close()
    s.close()
    
    cmd = "cat /tmp/temp_test.sql | docker exec -i supabase-db psql -U supabase_admin -d postgres -A"
    stdin, stdout, stderr = c.exec_command(cmd)
    err = stderr.read().decode("utf-8").strip()
    
    notice_line = [line for line in err.split('\n') if 'NOTICE:  TRIGGER_OUT:' in line]
    
    print(f"\nCase: {tc['name']}")
    print("  [Preview RPC]   :", preview_res)
    print("  [Trigger Exec]  :", notice_line[0] if notice_line else err)

c.close()
