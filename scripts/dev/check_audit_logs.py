import paramiko

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)

cmd = '''docker exec -i supabase-db psql -U supabase_admin -d postgres -c "SELECT id, action, table_name, new_data, created_at FROM public.audit_logs_crm ORDER BY created_at DESC LIMIT 5;"'''
stdin, stdout, stderr = c.exec_command(cmd)
print(stdout.read().decode("utf-8"))

c.close()
