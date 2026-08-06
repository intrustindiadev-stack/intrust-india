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
BEGIN;
-- Insert a test team for routing
INSERT INTO teams (id, name, region_level, state, city, parent_team_id)
VALUES ('77777777-7777-7777-7777-777777777777', 'Delhi City Team', 'city', 'Delhi', 'New Delhi', (SELECT id FROM teams WHERE region_level = 'state' AND state = 'Madhya Pradesh' LIMIT 1));

INSERT INTO team_service_areas (team_id, area_type, value, state, city)
VALUES ('77777777-7777-7777-7777-777777777777', 'city', 'New Delhi', 'Delhi', 'New Delhi');

-- Insert a lead matching the city
INSERT INTO crm_leads (id, contact_name, state, city, source, phone)
VALUES ('88888888-8888-8888-8888-888888888888', 'Routing Test Lead', 'Delhi', 'New Delhi', 'Test', '1111111111');

-- Verify assignment
SELECT id, contact_name, assigned_team_id, territory_match_type, routing_status FROM crm_leads WHERE id = '88888888-8888-8888-8888-888888888888';

ROLLBACK;
"""
sftp.putfo(io.BytesIO(sql.encode()), "/tmp/verify_routing3.sql")
_, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres -t -c \"$(cat /tmp/verify_routing3.sql)\"")
print("STDOUT:", stdout.read().decode().strip())
print("STDERR:", stderr.read().decode().strip())
