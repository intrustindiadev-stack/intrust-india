import paramiko
import io
import json

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
sftp = c.open_sftp()

sql = """
BEGIN;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "582d3d78-cf98-46af-86b8-9f133cd55e7a"}';
SELECT id, contact_name FROM crm_leads WHERE id = '0c11475b-50e9-4284-8eb0-61fbb0d91215';
COMMIT;
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/test_rls.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres -c \"$(cat /tmp/test_rls.sql)\"")
print("STDOUT:", stdout.read().decode().strip())
print("STDERR:", stderr.read().decode().strip())
