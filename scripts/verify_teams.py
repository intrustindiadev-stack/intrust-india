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
-- Simulate Team Creation Validation
BEGIN;
SELECT admin_create_team(
    'QA Test Area Team', 'area', 'QA testing', 'Madhya Pradesh', 'Bhopal', 'MP Nagar', null, null, '#000000', '00000000-0000-0000-0000-000000000000'::uuid, 'test_req_1'
);

-- Check if it created correctly
SELECT id, name, region_level, parent_team_id FROM teams WHERE name = 'QA Test Area Team';
ROLLBACK;
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/verify_teams.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres -t -c \"$(cat /tmp/verify_teams.sql)\"")
print("STDOUT:", stdout.read().decode().strip())
print("STDERR:", stderr.read().decode().strip())
