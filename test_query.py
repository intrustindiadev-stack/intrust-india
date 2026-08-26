import paramiko

host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"

def run_query(query):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=host, username=user, password=password)
    sftp = client.open_sftp()
    with sftp.file("/tmp/temp_query.sql", "w") as f:
        f.write(query)
    sftp.close()
    
    stdin, stdout, stderr = client.exec_command("docker exec -i supabase-db psql -U postgres -d postgres -t -c \"$(cat /tmp/temp_query.sql)\"")
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))
    client.close()

run_query("SELECT * FROM pg_available_extensions WHERE name = 'plpgsql_check';")
