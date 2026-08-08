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
    return out

print("--- 1. Testing Preview RPC vs Trigger Match ---")

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
    BEGIN;
    INSERT INTO public.crm_leads (title, contact_name, pincode, zone, area, city, state)
    VALUES ('Test {tc["name"]}', 'Test Contact', {pincode}, {zone}, {area}, {city}, {state});
    SELECT assigned_team_id || '|' || COALESCE(territory_match_type::text, 'NULL') || '|' || routing_status FROM public.crm_leads WHERE title = 'Test {tc["name"]}';
    ROLLBACK;
    """
    trigger_res = exec_query(sql_test)
    print(f"\nCase: {tc['name']}")
    print("Preview RPC output:", preview_res)
    print("Trigger INSERT output:", trigger_res)

c.close()
