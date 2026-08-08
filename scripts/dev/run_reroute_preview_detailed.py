import paramiko
import sys

host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"

def run_sql(sql):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=host, username=user, password=password)
        sftp = client.open_sftp()
        with sftp.file("/tmp/temp_query.sql", "w") as f:
            f.write(sql)
        sftp.close()
        
        stdin, stdout, stderr = client.exec_command("docker exec -i supabase-db psql -U postgres -d postgres < /tmp/temp_query.sql")
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        return out, err
    finally:
        client.close()

sql = """
-- Top cities in the 9,501 reroute_pending leads
SELECT city, COUNT(*) as lead_count
FROM public.crm_leads
WHERE archived_at IS NULL AND source NOT IN ('Users','App User') AND routing_status = 'reroute_pending'
GROUP BY city
ORDER BY lead_count DESC
LIMIT 15;
"""

out, err = run_sql(sql)
print(out)
if err: print("ERR:", err)
