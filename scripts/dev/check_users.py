import paramiko

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

cmd = '''docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A -c "SELECT count(*) FROM public.user_profiles;"'''
stdin, stdout, stderr = c.exec_command(cmd)
print("Count user_profiles:", stdout.read().decode("utf-8").strip())

cmd2 = '''docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A -c "SELECT id, email, role, is_active FROM public.user_profiles LIMIT 5;"'''
stdin, stdout, stderr = c.exec_command(cmd2)
print("Users:", stdout.read().decode("utf-8").strip())

c.close()
