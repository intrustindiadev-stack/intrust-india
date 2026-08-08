import paramiko
import json

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

loc_json = json.dumps([
    {"index": 0, "pincode": "462022"},
    {"index": 1, "zone": "Awadhpuri", "city": "Bhopal"},
    {"index": 2, "city": "NonExistentCity9999"}
])

sql = f"SELECT public.crm_bulk_preview_team_for_location('{loc_json}'::jsonb);"
cmd = f'''docker exec -i supabase-db psql -U supabase_admin -d postgres -c "{sql}"'''
stdin, stdout, stderr = c.exec_command(cmd)
print(stdout.read().decode("utf-8"))

c.close()
