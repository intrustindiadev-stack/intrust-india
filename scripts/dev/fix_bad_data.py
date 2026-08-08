import paramiko
import sys

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    
    cmd = '''docker exec -i supabase-db psql -U supabase_admin -d postgres -c "SELECT id, area_type, value FROM public.team_service_areas WHERE area_type IN ('city', 'state') AND value ~ '^[0-9]+$';"'''
    stdin, stdout, stderr = c.exec_command(cmd)
    
    out = stdout.read().decode("utf-8")
    print(out)
    
    # Delete them
    cmd2 = '''docker exec -i supabase-db psql -U supabase_admin -d postgres -c "DELETE FROM public.team_service_areas WHERE area_type IN ('city', 'state') AND value ~ '^[0-9]+$';"'''
    c.exec_command(cmd2)
    
    c.close()
except Exception as e:
    print("Error:", str(e))
    sys.exit(1)
