import json
import re

def load_json(filename):
    with open(filename, 'r') as f:
        content = f.read().strip()
        if not content: return []
        try:
            return json.loads(content)
        except:
            return []

functions = load_json('db_functions.json')
policies = load_json('db_policies.json')
triggers = load_json('db_triggers.json')
tables = load_json('db_tables.json')

report = []
report.append("# INTRUST INDIA — FULL SECURITY AUDIT")
report.append("\n## 1. Executive Summary")
report.append("This report contains a full-platform security audit covering authentication, authorization, RPCs, RLS, payment security, and HR/CRM modules.")

report.append("\n## 7. PostgreSQL Function / RPC Audit")
for func in functions:
    if not func: continue
    name = func.get('name')
    if not name: continue
    
    definition = func.get('definition', '')
    grants = func.get('grants', [])
    sec_definer = func.get('security_definer', False)
    
    if not definition: continue
    
    auth_uid = 'auth.uid()' in definition
    search_path = 'SET search_path' in definition
    
    exec_anon = False
    exec_auth = False
    exec_public = False
    if grants:
        for g in grants:
            if not g: continue
            if g.get('privilege_type') == 'EXECUTE':
                grantee = g.get('grantee')
                if grantee == 'anon': exec_anon = True
                if grantee == 'authenticated': exec_auth = True
                if grantee == 'PUBLIC': exec_public = True

    financial = any(word in definition.lower() for word in ['wallet', 'paise', 'reward', 'credit', 'debit', 'payment'])
    
    if sec_definer or exec_anon or exec_auth or exec_public:
        report.append(f"\n### Function: `{name}`")
        report.append(f"- **Security Definer**: {sec_definer}")
        report.append(f"- **Has auth.uid() check**: {auth_uid}")
        report.append(f"- **Has search_path**: {search_path}")
        report.append(f"- **Grants**: anon={exec_anon}, authenticated={exec_auth}, PUBLIC={exec_public}")
        report.append(f"- **Is Financial/Reward**: {financial}")
        
        args = re.search(r'public\.[a-zA-Z0-9_]+\((.*?)\)', definition)
        if args:
            args_str = args.group(1)
            report.append(f"- **Arguments**: `{args_str}`")
            if 'uuid' in args_str.lower() and not auth_uid:
                report.append("- **⚠️ WARNING**: Takes UUID parameter but lacks auth.uid() check (potential BOLA/IDOR)")

report.append("\n## 6. RLS Audit")
tables_with_rls = set([p['table'] for p in policies if p])
for table in tables_with_rls:
    report.append(f"\n### Table: `{table}`")
    table_policies = [p for p in policies if p and p['table'] == table]
    for p in table_policies:
        report.append(f"- **{p['cmd']}** (`{p['policy']}`):")
        report.append(f"  - Roles: {p['roles']}")
        report.append(f"  - Using: `{p['qual']}`")
        if p['with_check']:
            report.append(f"  - With Check: `{p['with_check']}`")
        
        if p['cmd'] in ('UPDATE', 'ALL'):
            if 'auth.jwt()' in str(p['qual']):
                report.append("  - **⚠️ WARNING**: Uses JWT metadata for authorization")
            if 'auth.uid()' in str(p['qual']) and not 'user_profiles' in str(p['qual']):
                report.append("  - **⚠️ WARNING**: Simple ownership check on UPDATE. Needs column-level guards.")

with open('audit_report_raw.md', 'w') as f:
    f.write('\n'.join(report))
print("Raw report generated.")
