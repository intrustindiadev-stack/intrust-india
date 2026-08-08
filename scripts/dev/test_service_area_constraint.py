import paramiko

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

team_id = "2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef"

# Try inserting invalid city='462022'
cmd = f'''docker exec -i supabase-db psql -U supabase_admin -d postgres -c "INSERT INTO public.team_service_areas (team_id, area_type, value) VALUES ('{team_id}', 'city', '462022');"'''
stdin, stdout, stderr = c.exec_command(cmd)
print("Inserting city='462022' result:")
print("OUT:", stdout.read().decode("utf-8"))
print("ERR:", stderr.read().decode("utf-8"))

c.close()
