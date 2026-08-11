import paramiko
import json

HOST = "187.124.98.130"
USER = "intrustindia"
PASSWORD = "Intrustdev@2026"

def run_query(client, query):
    cmd = "docker exec supabase-db psql -U postgres -d postgres -t -A -c \"" + query.replace('"', '\\"') + "\""
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if err: print("ERR:", err[:500])
    return out

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=HOST, username=USER, password=PASSWORD)

print("Extracting Functions...")
funcs_query = """
SELECT json_agg(json_build_object(
    'name', p.proname,
    'security_definer', p.prosecdef,
    'definition', pg_get_functiondef(p.oid),
    'grants', (
        SELECT json_agg(json_build_object('grantee', grantee, 'privilege_type', privilege_type))
        FROM information_schema.routine_privileges rp
        WHERE rp.routine_name = p.proname AND rp.routine_schema = 'public'
    )
))
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';
"""
funcs_json = run_query(client, funcs_query)
with open('db_functions.json', 'w') as f:
    f.write(funcs_json)

print("Extracting Policies...")
policies_query = """
SELECT json_agg(json_build_object(
    'table', tablename,
    'policy', policyname,
    'cmd', cmd,
    'roles', roles,
    'qual', qual,
    'with_check', with_check
))
FROM pg_policies
WHERE schemaname = 'public';
"""
policies_json = run_query(client, policies_query)
with open('db_policies.json', 'w') as f:
    f.write(policies_json)

print("Extracting Triggers...")
triggers_query = """
SELECT json_agg(json_build_object(
    'table', event_object_table,
    'trigger', trigger_name,
    'event_manipulation', event_manipulation,
    'action_statement', action_statement,
    'action_orientation', action_orientation,
    'action_timing', action_timing
))
FROM information_schema.triggers
WHERE trigger_schema = 'public';
"""
triggers_json = run_query(client, triggers_query)
with open('db_triggers.json', 'w') as f:
    f.write(triggers_json)
    
print("Extracting Table Schema...")
tables_query = """
SELECT json_agg(json_build_object(
    'table_name', table_name,
    'columns', (
        SELECT json_agg(json_build_object('column_name', column_name, 'data_type', data_type))
        FROM information_schema.columns c
        WHERE c.table_name = t.table_name AND c.table_schema = 'public'
    )
))
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"""
tables_json = run_query(client, tables_query)
with open('db_tables.json', 'w') as f:
    f.write(tables_json)

client.close()
print("Done.")
