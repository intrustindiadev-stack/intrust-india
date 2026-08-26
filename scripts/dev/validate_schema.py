import paramiko
import sys
import json

host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"

def run_query(query):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=host, username=user, password=password)
        sftp = client.open_sftp()
        with sftp.file("/tmp/temp_validate_schema.sql", "w") as f:
            f.write(query)
        sftp.close()
        
        # We must capture stdout, returning it line by line
        stdin, stdout, stderr = client.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres -t -c \"$(cat /tmp/temp_validate_schema.sql)\"")
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        return out, err
    finally:
        client.close()

validation_sql = """
-- First, ensure plpgsql_check is created
CREATE EXTENSION IF NOT EXISTS plpgsql_check;

-- Verify Views
DO $$
DECLARE
    v_record RECORD;
BEGIN
    FOR v_record IN SELECT table_schema, table_name FROM information_schema.views WHERE table_schema = 'public' LOOP
        BEGIN
            EXECUTE format('SELECT 1 FROM %I.%I LIMIT 1', v_record.table_schema, v_record.table_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'SCHEMA_ERROR: BROKEN VIEW: %.% - %', v_record.table_schema, v_record.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Verify Functions and Triggers
SELECT 
    p.proname as function_name, 
    err.functionid::regprocedure,
    err.message,
    err.detail,
    err.hint,
    err.context
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid,
    LATERAL plpgsql_check_function(p.oid) err
WHERE 
    n.nspname = 'public' 
    AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
    AND err.message NOT LIKE 'never read variable%'
    AND err.message NOT LIKE 'variable%is declared but never used%'
    AND err.message NOT LIKE 'out parameter%is not assigned%'
    AND err.message NOT LIKE 'parameter%is never read%'
    AND err.message NOT LIKE 'too many%parameters%';
"""

print("Running Database Schema Validation with plpgsql_check...")
out, err = run_query(validation_sql)

errors = []
# Parse standard plpgsql_check output rows and NOTICE from views
for line in err.split('\n'):
    if 'SCHEMA_ERROR:' in line:
        errors.append(line.strip())

# The query output will have function errors if any
out_lines = [line.strip() for line in out.split('\n') if line.strip()]

if out_lines:
    for line in out_lines:
        if "|" in line:
            errors.append("FUNCTION_ERROR: " + line)

if errors:
    print("SCHEMA VALIDATION FAILED:")
    for e in errors:
        print("  -", e)
    sys.exit(1)
else:
    print("SCHEMA VALIDATION PASSED")
    sys.exit(0)
