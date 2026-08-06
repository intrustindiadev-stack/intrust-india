import paramiko
import io

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

ADMIN_ID = "e6442e9b-d5f6-400d-93a9-282f2ed36369"
BHARTI_ID = "6307e2d0-1176-481c-9770-0d093a5b610b"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
sftp = c.open_sftp()

# Update all leads that were imported by admin (created_by = ADMIN_ID) and source = 'PDF Import'
# to be created_by Bharti Chouhan
sql = f"""
UPDATE public.crm_leads
SET created_by = '{BHARTI_ID}'
WHERE created_by = '{ADMIN_ID}'
  AND source = 'PDF Import';
"""

sftp.putfo(io.BytesIO(sql.encode()), "/tmp/update_created_by.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/update_created_by.sql")
out = stdout.read().decode()
err = stderr.read().decode()
print("STDOUT:", out)
print("STDERR:", err)

# Confirm how many were updated
sql2 = f"""
SELECT COUNT(*) FROM public.crm_leads
WHERE created_by = '{BHARTI_ID}' AND source = 'PDF Import';
"""
sftp.putfo(io.BytesIO(sql2.encode()), "/tmp/count_bharti_leads.sql")
_, stdout2, stderr2 = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/count_bharti_leads.sql")
print("CONFIRM COUNT:", stdout2.read().decode())
