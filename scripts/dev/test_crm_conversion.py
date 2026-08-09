import paramiko

HOST = '187.124.98.130'
USER = 'intrustindia'
PASSWORD = 'Intrustdev@2026'

def run_db_query(sql_query):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASSWORD)
        cmd = f'''docker exec -i supabase-db psql -U postgres -d postgres -t -A << 'EOF'
{sql_query}
EOF
'''
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        
        if error and not error.startswith("NOTICE:"):
            print("DB Error/Notice:", error)
            
        return output
    finally:
        ssh.close()

def main():
    print("Running CRM Conversion Tests (inside a ROLLBACK block)...")
    
    test_sql = """
BEGIN;

-- Existing Entities (Real IDs from DB)
-- Admin: 6e81e8f5-337d-4d92-ab4f-e633f890b8de
-- Customer: 2c7a4dd7-fc49-418a-95c6-03047721eb77 (Sneha Mehra, +918962366522, snehamehra518@gmail.com)
-- Merchant: 436b7af7-54f7-47d2-9b0a-7005a8a82baa (Vedansh Overseas, 9424933782, mraghuvanshi776@gmail.com)

-- Create test leads matching existing entities
INSERT INTO public.crm_leads (id, title, contact_name, phone, email, status, lifecycle_status, assigned_to, created_by)
VALUES 
('11111111-1111-1111-1111-000000000001', 'Test Lead 1', 'Lead 1 (Customer Match Phone)', '+918962366522', NULL, 'new', 'active', '6e81e8f5-337d-4d92-ab4f-e633f890b8de', '6e81e8f5-337d-4d92-ab4f-e633f890b8de'),
('11111111-1111-1111-1111-000000000002', 'Test Lead 2', 'Lead 2 (Customer Match Email)', '1234567890', 'snehamehra518@gmail.com', 'new', 'active', '6e81e8f5-337d-4d92-ab4f-e633f890b8de', '6e81e8f5-337d-4d92-ab4f-e633f890b8de'),
('11111111-1111-1111-1111-000000000003', 'Test Lead 3', 'Lead 3 (Merchant Match Biz Phone)', '9424933782', NULL, 'new', 'active', '6e81e8f5-337d-4d92-ab4f-e633f890b8de', '6e81e8f5-337d-4d92-ab4f-e633f890b8de'),
('11111111-1111-1111-1111-000000000004', 'Test Lead 4', 'Lead 4 (Merchant Match Email)', NULL, 'mraghuvanshi776@gmail.com', 'new', 'active', '6e81e8f5-337d-4d92-ab4f-e633f890b8de', '6e81e8f5-337d-4d92-ab4f-e633f890b8de'),
('11111111-1111-1111-1111-000000000005', 'Test Lead 5', 'Lead 5 (No Match)', '8888888888', 'nobody@example.com', 'new', 'active', '6e81e8f5-337d-4d92-ab4f-e633f890b8de', '6e81e8f5-337d-4d92-ab4f-e633f890b8de');

-- NOW SWITCH ROLE TO ADMIN
SET LOCAL request.jwt.claims TO '{"sub": "6e81e8f5-337d-4d92-ab4f-e633f890b8de", "role": "authenticated"}';
SET LOCAL role TO authenticated;

-- TEST 1: Check customer lead 1 (should find)
SELECT 'TEST 1 (Check Cust by Phone): ' || COALESCE((crm_check_customer_for_lead('11111111-1111-1111-1111-000000000001')->>'found'), 'null');

-- TEST 2: Convert lead 1 to customer (should succeed)
SELECT 'TEST 2 (Convert Cust by Phone): ' || COALESCE((crm_convert_lead_to_customer('11111111-1111-1111-1111-000000000001', '2c7a4dd7-fc49-418a-95c6-03047721eb77')->>'success'), 'null');

-- TEST 3: Verify DB state for lead 1
SELECT 'TEST 3 (DB State Lead 1): lifecycle=' || lifecycle_status || ', status=' || status || ', converted_user_id=' || converted_user_id
FROM public.crm_leads WHERE id = '11111111-1111-1111-1111-000000000001';

-- TEST 4: Attempt duplicate customer conversion (lead 2 -> same customer, should NOW SUCCEED, returning history count 1 for check)
SELECT 'TEST 4 (Check Dup Cust - count should be 1): ' || COALESCE(jsonb_extract_path_text(crm_check_customer_for_lead('11111111-1111-1111-1111-000000000002'), 'existing_leads_info', 'count'), 'null');
SELECT 'TEST 4 (Dup Convert): ' || COALESCE(crm_convert_lead_to_customer('11111111-1111-1111-1111-000000000002', '2c7a4dd7-fc49-418a-95c6-03047721eb77')->>'success', 'false');

-- TEST 5: Convert lead 3 to merchant (should succeed)
SELECT 'TEST 5 (Convert Merchant by Phone): ' || COALESCE(crm_convert_lead_to_merchant('11111111-1111-1111-1111-000000000003', '436b7af7-54f7-47d2-9b0a-7005a8a82baa')->>'success', 'false');

-- TEST 6: Convert lead 4 to same merchant (should succeed 1:N)
SELECT 'TEST 6 (Check Dup Merch - count should be 1): ' || COALESCE(jsonb_extract_path_text(crm_check_merchant_for_lead('11111111-1111-1111-1111-000000000004'), 'existing_leads_info', 'count'), 'null');
SELECT 'TEST 6 (Convert Merch 1:N): ' || COALESCE(crm_convert_lead_to_merchant('11111111-1111-1111-1111-000000000004', '436b7af7-54f7-47d2-9b0a-7005a8a82baa')->>'success', 'false');

-- TEST 7: Convert lead 1 to merchant as well (should become converted_both)
-- Must switch to postgres to bypass RLS for direct update on email, but admin can update crm_leads in this CRM layer.
UPDATE public.crm_leads SET phone = '9424933782' WHERE id = '11111111-1111-1111-1111-000000000001';
SELECT 'TEST 7 (Convert Both): ' || COALESCE(crm_convert_lead_to_merchant('11111111-1111-1111-1111-000000000001', '436b7af7-54f7-47d2-9b0a-7005a8a82baa')->>'lifecycle_status', 'null');

-- TEST 8: Invalid identity match check (Lead 5 -> customer, should fail)
SELECT 'TEST 8 (Mismatch Identity): ' || COALESCE(crm_convert_lead_to_customer('11111111-1111-1111-1111-000000000005', '2c7a4dd7-fc49-418a-95c6-03047721eb77')->>'success', 'false');

-- Verify Activities
SELECT 'ACTIVITIES LOGGED: ' || count(*) FROM public.crm_lead_activities WHERE lead_id IN ('11111111-1111-1111-1111-000000000001', '11111111-1111-1111-1111-000000000002', '11111111-1111-1111-1111-000000000003', '11111111-1111-1111-1111-000000000004') AND action_type IN ('converted_to_customer', 'converted_to_merchant');

ROLLBACK;
"""
    print(run_db_query(test_sql))

if __name__ == '__main__':
    main()
