"""
Apply ONLY the 20260831_ai_grow_wallet_ledger.sql migration to the VPS.
"""
import paramiko
import sys

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

MIGRATION_FILE = "/home/i4yush/Desktop/intrust-india/supabase/migrations/20260831_ai_grow_wallet_ledger.sql"
REMOTE_PATH = "/tmp/20260831_ai_grow_wallet_ledger.sql"

def apply():
    try:
        print(f"Connecting to {VPS_HOST}...")
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
        sftp = c.open_sftp()

        print(f"Uploading migration...")
        sftp.put(MIGRATION_FILE, REMOTE_PATH)
        sftp.close()

        print(f"Applying migration...")
        cmd = f"cat {REMOTE_PATH} | docker exec -i supabase-db psql -U supabase_admin -d postgres"
        stdin, stdout, stderr = c.exec_command(cmd)

        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")

        print("--- STDOUT ---")
        if out.strip():
            print(out.strip())
        else:
            print("(no output)")

        if err.strip():
            print("--- STDERR ---")
            print(err.strip())

        # Cleanup
        c.exec_command(f"rm {REMOTE_PATH}")
        c.close()

        # Check for errors
        if "ERROR" in err.upper() and "NOTICE" not in err.upper():
            print("\n❌ Migration failed — see STDERR above.")
            sys.exit(1)
        else:
            print("\n✅ Migration applied successfully.")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply()
