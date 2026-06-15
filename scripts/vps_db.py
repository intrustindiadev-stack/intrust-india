import os
import sys
import json
import paramiko

DB_USER = "postgres"
DB_NAME = "postgres"
VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASS = "Intrustdev@2026"

def execute_query(sql):
    try:
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
        
        # Escape single quotes in SQL for bash
        escaped_sql = sql.replace("'", "'\\''")
        
        # Execute query and output as JSON
        cmd = f"docker exec supabase-db psql -U {DB_USER} -d {DB_NAME} -t -c 'SELECT row_to_json(t) FROM ( {escaped_sql} ) t;'"
        
        stdin, stdout, stderr = c.exec_command(cmd)
        
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        
        if err and not out:
            print(json.dumps({"status": "error", "message": err}))
            sys.exit(1)
            
        if not out:
            print(json.dumps({"status": "success", "message": "Query executed successfully. No rows returned."}))
            sys.exit(0)
            
        # Parse the psql JSON output lines
        results = []
        for line in out.split('\\n'):
            line = line.strip()
            if line:
                try:
                    results.append(json.loads(line))
                except:
                    pass
                    
        print(json.dumps(results, indent=2))
        
        c.close()
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vps_db.py \"<SQL_QUERY>\"")
        sys.exit(1)
    
    query = sys.argv[1]
    execute_query(query)
