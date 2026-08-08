import paramiko
import sys
import json

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

def run_psql(query):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    
    # Escape quotes
    cmd = f'''docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A -c "{query}"'''
    stdin, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode("utf-8").strip()
    err = stderr.read().decode("utf-8").strip()
    c.close()
    return out, err

print("=== STARTING SYSTEM VERIFICATION ===")

# 1. Fetch some service areas to craft exact tests
areas_out, _ = run_psql("SELECT area_type, value, city, state, team_id FROM public.team_service_areas LIMIT 10;")
print("Sample Team Service Areas in DB:\n", areas_out)

# 2. Fetch a valid employee and an inactive/non-CRM employee
users_out, _ = run_psql("SELECT id, email, role, is_active, team_id FROM public.user_profiles LIMIT 10;")
print("\nSample User Profiles:\n", users_out)

