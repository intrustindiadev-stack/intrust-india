import paramiko
import re

HOST = "187.124.98.130"
USER = "intrustindia"
PASSWORD = "Intrustdev@2026"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=HOST, username=USER, password=PASSWORD)

query = """
SELECT p.proname, pg_get_functiondef(p.oid) as def
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.prosecdef = true
  AND (
      pg_get_functiondef(p.oid) ILIKE '%wallet%' OR
      pg_get_functiondef(p.oid) ILIKE '%paise%' OR
      pg_get_functiondef(p.oid) ILIKE '%reward%' OR
      pg_get_functiondef(p.oid) ILIKE '%credit%' OR
      pg_get_functiondef(p.oid) ILIKE '%debit%' OR
      pg_get_functiondef(p.oid) ILIKE '%payment%'
  );
"""

cmd = "docker exec supabase-db psql -U postgres -d postgres -t -c \"" + query.replace('"', '\\"') + "\""
_, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8')

# The output is messy, let's parse it somewhat
print("=== FINANCIAL FUNCTION AUDIT ===\n")
for line in out.split('CREATE OR REPLACE FUNCTION'):
    if not line.strip(): continue
    func = 'CREATE OR REPLACE FUNCTION' + line
    name_match = re.search(r'public\.([a-zA-Z0-9_]+)\(', func)
    if not name_match: continue
    name = name_match.group(1)
    
    print(f"--- {name} ---")
    if 'auth.uid()' in func:
        print("✅ Contains auth.uid() check")
    else:
        print("❌ NO auth.uid() check")
        
    if 'p_user_id' in func or 'p_customer_id' in func or 'p_admin_user_id' in func:
        print("⚠️ Accepts user ID parameter")

client.close()
