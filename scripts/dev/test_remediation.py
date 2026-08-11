import os
import paramiko
import sys
import json

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

# Using Ayush for testing notifications
TEST_USER_ID = "e932b17a-8f4b-4b24-9b21-4fbd73ebfc4b" 
TEST_USER_ID2 = "b328a6f0-02c3-4d40-ba84-3c65cbe98c25"

SQL_SCRIPT = f"""
BEGIN;
    -- 1. Test Admin Tasks trigger
    INSERT INTO admin_tasks (title, assigned_to, assigned_by, priority, status) 
    VALUES ('TEST TASK 1', '{TEST_USER_ID}', '{TEST_USER_ID2}', 'medium', 'pending')
    RETURNING id INTO TEMP test_task_id;

    -- Verify insertion of notification for assigned task
    SELECT id, title, type, action_url, metadata INTO TEMP notif_admin_assign FROM notifications WHERE reference_type = 'admin_task' AND user_id = '{TEST_USER_ID}' ORDER BY created_at DESC LIMIT 1;
    
    -- Update task to reassigned
    UPDATE admin_tasks SET assigned_to = '{TEST_USER_ID2}' WHERE id = (SELECT test_task_id);
    SELECT id, title, type, action_url, metadata INTO TEMP notif_admin_reassign FROM notifications WHERE reference_type = 'admin_task' AND user_id = '{TEST_USER_ID2}' ORDER BY created_at DESC LIMIT 1;

    -- Update task to completed
    UPDATE admin_tasks SET status = 'completed' WHERE id = (SELECT test_task_id);
    SELECT id, title, type, action_url, metadata INTO TEMP notif_admin_complete FROM notifications WHERE reference_type = 'admin_task' AND user_id = '{TEST_USER_ID2}' ORDER BY created_at DESC LIMIT 1; -- Should notify assigned_by but since assigned_by was TEST_USER_ID2 and it was reassigned to TEST_USER_ID2, maybe no notification. Wait, if assigned_by is TEST_USER_ID2 and assigned_to is TEST_USER_ID2, it shouldn't notify. Let's just output it anyway.

    -- 2. Test User Profile Role Change
    UPDATE user_profiles SET role = 'admin' WHERE id = '{TEST_USER_ID}';
    SELECT id, title, type, action_url, metadata INTO TEMP notif_role_change FROM notifications WHERE reference_type = 'profile_role_update' AND user_id = '{TEST_USER_ID}' ORDER BY created_at DESC LIMIT 1;
    
    -- Output results as JSON (we will rollback to not affect production)
    SELECT json_build_object(
        'admin_assigned', (SELECT row_to_json(notif_admin_assign)),
        'admin_reassigned', (SELECT row_to_json(notif_admin_reassign)),
        'admin_completed', (SELECT row_to_json(notif_admin_complete)),
        'role_change', (SELECT row_to_json(notif_role_change))
    ) AS test_results;
ROLLBACK;
"""

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    
    remote_path = f"/tmp/test_notifs.sql"
    sftp = c.open_sftp()
    with sftp.file(remote_path, 'w') as f:
        f.write(SQL_SCRIPT)
    sftp.close()

    cmd = f"cat {remote_path} | docker exec -i supabase-db psql -U supabase_admin -d postgres -t"
    stdin, stdout, stderr = c.exec_command(cmd)
    
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    
    print("--- OUTPUT ---")
    print(out.strip())
    if err.strip():
        print("STDERR:", err.strip())
    
    c.exec_command(f"rm {remote_path}")
    c.close()
except Exception as e:
    print("Error:", str(e))
    sys.exit(1)
