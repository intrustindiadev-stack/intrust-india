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
report.append("A comprehensive security audit of the INTRUST India platform was conducted, extending beyond the components involved in the August 11, 2026 privilege escalation incident. The audit reveals widespread use of `SECURITY DEFINER` functions lacking internal `auth.uid()` checks and proper `EXECUTE` grant restrictions. RLS policies frequently rely on easily bypassed mechanisms or perform simple ownership checks on updates without column-level guards, leading to potential mass assignment and privilege escalation vulnerabilities across multiple modules (Wallet, Checkout, CRM, HRM).")

report.append("\n## 2. Incident Reconstruction")
report.append("The attacker bypassed intended frontend restrictions by directly calling the Supabase REST/RPC APIs. They exploited `admin_update_user_role` (which lacked robust internal authentication checks) to escalate their role to `admin`. With administrative privileges, they manipulated the global reward configuration. They further abused `atomic_customer_wallet_credit` (which was executable by `anon` and `authenticated` users without validating `auth.uid()`) to inflate their wallet balance. These funds were then used to place fraudulent orders and drain platform inventory.")

report.append("\n## 7. PostgreSQL Function / RPC Audit (Including SECURITY DEFINER)")
report.append("The following `SECURITY DEFINER` functions present significant risk due to accepting caller-supplied identity/financial parameters without internal validation (`auth.uid()`), and are exposed to `anon` or `authenticated` roles:")

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
    
    if sec_definer and (exec_anon or exec_auth or exec_public) and not auth_uid:
        report.append(f"\n### `{name}`")
        args = re.search(r'public\.[a-zA-Z0-9_]+\((.*?)\)', definition)
        args_str = args.group(1) if args else 'None'
        report.append(f"- **Arguments**: `{args_str}`")
        report.append(f"- **Risk**: High/Critical. Function executes with elevated privileges but lacks internal caller verification (`auth.uid()`). Caller can supply arbitrary parameters.")
        if financial:
            report.append("- **Category**: Financial/Wallet manipulation risk.")
        if not search_path:
            report.append("- **Note**: Lacks `SET search_path` (Search-path injection risk).")

report.append("\n## 6. RLS Audit (High-Risk Policies)")
tables_with_rls = set([p['table'] for p in policies if p])
for table in tables_with_rls:
    table_policies = [p for p in policies if p and p['table'] == table]
    for p in table_policies:
        if p['cmd'] in ('UPDATE', 'ALL'):
            if 'auth.jwt()' in str(p['qual']):
                report.append(f"- **{table}**: `{p['policy']}` relies on mutable JWT metadata (`auth.jwt() -> 'user_metadata'`).")
            if 'auth.uid()' in str(p['qual']) and not 'user_profiles' in str(p['qual']):
                report.append(f"- **{table}**: `{p['policy']}` allows unrestricted `UPDATE` based solely on ownership. (Mass assignment risk on privileged columns).")

report.append("\n## 29. Confirmed Vulnerabilities (Priority List)")
report.append("""
| Finding ID | Severity | Component | Issue | Recommended Fix |
|---|---|---|---|---|
| VULN-FIN-01 | CRITICAL | Wallet/RPC | `customer_purchase_from_merchant` lacks `auth.uid()` check and accepts `p_customer_id`. | Inject `auth.uid()` check internally. |
| VULN-FIN-02 | CRITICAL | Wallet/RPC | `finalize_gateway_orders` lacks `auth.uid()` check and accepts `p_customer_id`. | Inject `auth.uid()` check internally. |
| VULN-FIN-03 | CRITICAL | Wallet/RPC | `perform_wallet_adjustment` accepts `p_admin_user_id` without verifying caller. | Derive admin ID from `auth.uid()` and verify role. |
| VULN-FIN-04 | CRITICAL | Wallet/RPC | `calculate_and_distribute_rewards` accepts `p_user_id` without verifying caller. | Inject `auth.uid()` check internally. |
| VULN-BOLA-01 | HIGH | CRM/HRM | Multiple admin functions (e.g., `admin_update_team`) lack `auth.uid()` checks. | Restrict EXECUTE to `service_role` OR enforce `auth.uid()`. |
| VULN-RLS-01 | HIGH | Database/RLS | Multiple tables allow unrestricted UPDATEs if user owns the row. | Implement column-level triggers (similar to `user_profiles_sensitive_column_guard`). |
""")

with open('full_security_audit_report.md', 'w') as f:
    f.write('\n'.join(report))
print("Final report generated.")
