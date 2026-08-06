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
-- Check for orphaned team members
SELECT count(*) as orphaned_members FROM team_members WHERE team_id NOT IN (SELECT id FROM teams);

-- Check for circular references in teams
WITH RECURSIVE team_tree AS (
    SELECT id, parent_team_id, ARRAY[id] AS path, false AS is_cycle
    FROM teams
    UNION ALL
    SELECT t.id, t.parent_team_id, tt.path || t.id, t.id = ANY(tt.path)
    FROM teams t
    JOIN team_tree tt ON t.parent_team_id = tt.id
    WHERE NOT tt.is_cycle
)
SELECT id, path FROM team_tree WHERE is_cycle = true;

-- Check CRM routing log for failed routings
SELECT count(*) as failed_routings FROM crm_lead_routing_log WHERE to_team_id IS NULL AND action = 'auto_assign';
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/db_validation.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres -c \"$(cat /tmp/db_validation.sql)\"")
print("STDOUT:", stdout.read().decode().strip())
print("STDERR:", stderr.read().decode().strip())
