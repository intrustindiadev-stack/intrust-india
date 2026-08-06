import paramiko
import io

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
sftp = c.open_sftp()

sql = """
-- Backfill Phase 3: Set assigned_team_id for all existing leads to the primary team
-- so that managers can see them under the new Territory RLS policy.
UPDATE public.crm_leads 
SET assigned_team_id = '630fa633-dcc0-4209-afbf-de8c0bf9b0dd',
    routing_status = 'auto_matched'
WHERE assigned_team_id IS NULL;
"""

sftp.putfo(io.BytesIO(sql.encode()), "/tmp/backfill_leads.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/backfill_leads.sql")
print("STDOUT:", stdout.read().decode())
if stderr:
    print("STDERR:", stderr.read().decode())
