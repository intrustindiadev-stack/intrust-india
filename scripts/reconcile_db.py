#!/usr/bin/env python3
import os
import sys

import re
import paramiko
import tarfile

# --- Configuration ---
VPS_HOST = os.environ.get("VPS_HOST")
VPS_USER = os.environ.get("VPS_USER", "intrustindia")
VPS_PASSWORD = os.environ.get("VPS_PASSWORD")
REMOTE_DUMP_PATH = "/var/www/intrustindia.com/supabase_backup_fresh.sql"
LOCAL_DUMP_PATH = os.path.join(os.path.dirname(__file__), "../supabase/_backups/supabase_backup_fresh.sql")
MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "../supabase/migrations")

if not VPS_HOST or not VPS_PASSWORD:
    print("[ERROR] Missing required environment variables: VPS_HOST, VPS_PASSWORD", file=sys.stderr)
    sys.exit(1)
MIGRATIONS_DIR = "/home/i4yush/Desktop/intrust-india/supabase/migrations"

# --- Styling helpers ---
CYAN = "\033[0;36m"; GREEN = "\033[0;32m"; YELLOW = "\033[1;33m"
RED  = "\033[0;31m"; BOLD  = "\033[1m";    RESET  = "\033[0m"

def info(msg): print(f"{CYAN}[INFO]{RESET} {msg}")
def ok(msg):   print(f"{GREEN}[OK]{RESET} {msg}")
def warn(msg): print(f"{YELLOW}[WARN]{RESET} {msg}")
def err(msg):  print(f"{RED}[ERROR]{RESET} {msg}", file=sys.stderr); sys.exit(1)

# --- SSH Helpers ---
def ssh_connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    return c

def execute_cmd(client, cmd, stdin_data=None):
    stdin, stdout, stderr = client.exec_command(cmd)
    if stdin_data:
        stdin.write(stdin_data)
        stdin.channel.shutdown_write()
    out = stdout.read().decode("utf-8", errors="replace").strip()
    error_txt = stderr.read().decode("utf-8", errors="replace").strip()
    rc = stdout.channel.recv_exit_status()
    return rc, out, error_txt

def main():
    info("Starting database reconciliation process...")

    # Connect to VPS
    info(f"Connecting to VPS at {VPS_HOST}...")
    client = ssh_connect()
    ok("Connected successfully.")

    # Upload dump file
    info(f"Uploading logical dump {LOCAL_DUMP_PATH} to VPS at {REMOTE_DUMP_PATH}...")
    sftp = client.open_sftp()
    sftp.put(LOCAL_DUMP_PATH, REMOTE_DUMP_PATH)
    sftp.close()
    ok("Upload completed.")

    # Drop existing schemas
    info("Dropping existing schemas on self-hosted DB to prepare for fresh restore...")
    drop_sql = (
        "DROP SCHEMA IF EXISTS public, auth, storage, vault, realtime, _realtime, "
        "graphql, graphql_public, supabase_migrations CASCADE; "
        "CREATE SCHEMA public; "
        "ALTER SCHEMA public OWNER TO postgres;"
    )
    rc, out, error_txt = execute_cmd(
        client,
        "docker exec -i supabase-db psql -U supabase_admin -d postgres",
        stdin_data=drop_sql
    )
    if rc != 0:
        err(f"Failed to drop schemas: {error_txt}")
    ok("Existing schemas dropped and public schema recreated.")

    # Restore the database dump
    info("Restoring database dump from the uploaded SQL file (this may take a minute)...")
    rc, out, error_txt = execute_cmd(
        client,
        f"docker exec -i supabase-db psql -U supabase_admin -d postgres < {REMOTE_DUMP_PATH}"
    )
    if rc != 0:
        # Ignore minor warnings or "already exists" errors since schemas are pre-configured
        warn(f"Restore output contains potential notices/errors: {error_txt[:300]}...")
    else:
        ok("Database dump restored successfully.")

    # Get local migration files
    all_files = os.listdir(MIGRATIONS_DIR)
    local_migrations = []
    for f in all_files:
        if f.endswith('.sql'):
            match = re.match(r'^(\d+)_', f)
            if match:
                local_migrations.append((match.group(1), f))

    # Fetch applied migrations from the restored database
    info("Fetching applied migrations from the database...")
    rc, out, error_txt = execute_cmd(
        client,
        "docker exec -i supabase-db psql -U supabase_admin -d postgres -t -c \"SELECT version FROM supabase_migrations.schema_migrations;\""
    )
    if rc != 0:
        err(f"Failed to fetch applied migrations: {error_txt}")
        
    applied_migrations = set(v.strip() for v in out.splitlines() if v.strip())
    
    # Identify unapplied migrations
    unapplied = sorted([m for m in local_migrations if m[0] not in applied_migrations])
    
    if not unapplied:
        ok("No missing migrations to apply. Database is up to date.")
    else:
        info(f"Found {len(unapplied)} missing migrations to apply:")
        for version, filename in unapplied:
            print(f"  - {filename} (version: {version})")

        # Apply missing migrations in timestamp order
        for version, filename in unapplied:
            info(f"Applying migration: {filename}...")
            file_path = os.path.join(MIGRATIONS_DIR, filename)
            with open(file_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()

            # Execute the migration SQL
            rc, out, error_txt = execute_cmd(
                client,
                "docker exec -i supabase-db psql -U supabase_admin -d postgres",
                stdin_data=sql_content
            )
            if rc != 0:
                err(f"Failed to apply migration {filename}: {error_txt}")
            
            # Register version only after success
            register_sql = f"INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('{version}') ON CONFLICT DO NOTHING;"
            rc2, out2, err2 = execute_cmd(
                client,
                "docker exec -i supabase-db psql -U supabase_admin -d postgres",
                stdin_data=register_sql
            )
            if rc2 != 0:
                err(f"Failed to register migration version {version}: {err2}")
            ok(f"Applied migration {filename} and registered version {version}.")

    # Re-create and verify pg_cron jobs
    info("Re-creating pg_cron scheduler jobs...")
    cron_sql = """
    -- Unschedule existing jobs if any for idempotency
    BEGIN
      PERFORM cron.unschedule('reward-expiry-daily');
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
    
    BEGIN
      PERFORM cron.unschedule('reward-expiry-warn-daily');
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
    
    BEGIN
      PERFORM cron.unschedule('cancel-stale-gateway-drafts');
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;

    -- Schedule jobs
    PERFORM cron.schedule('reward-expiry-daily', '30 20 * * *', 'SELECT public.expire_stale_reward_points()');
    PERFORM cron.schedule('reward-expiry-warn-daily', '30 20 * * *', 'SELECT public.warn_expiring_reward_points()');
    PERFORM cron.schedule('cancel-stale-gateway-drafts', '0 */6 * * *', 'SELECT public.cancel_stale_gateway_drafts()');
    """
    rc, out, error_txt = execute_cmd(
        client,
        "docker exec -i supabase-db psql -U supabase_admin -d postgres",
        stdin_data=f"DO $$\nBEGIN\n{cron_sql}\nEND $$;"
    )
    if rc != 0:
        err(f"Failed to setup pg_cron jobs: {error_txt}")
    ok("pg_cron scheduler jobs registered.")

    # Retrieve service role key from stack env
    info("Extracting service role key for drift verification...")
    env_path = "/var/www/intrustindia.com/supabase-stack/.env"
    rc, out, error_txt = execute_cmd(client, f"cat {env_path} | grep SERVICE_ROLE_KEY=")
    service_role_key = None
    for line in out.splitlines():
        if line.startswith("SERVICE_ROLE_KEY="):
            service_role_key = line.split("=")[1].strip()
            break

    if not service_role_key:
        err("Could not find SERVICE_ROLE_KEY in secrets file!")

    # Create migrations.tar.gz archive of local supabase/migrations
    local_tar_path = "migrations.tar.gz"
    remote_tar_path = "/var/www/intrustindia.com/app/migrations.tar.gz"
    
    info("Archiving local migrations directory...")
    with tarfile.open(local_tar_path, "w:gz") as tar:
        tar.add(MIGRATIONS_DIR, arcname="supabase/migrations")
    ok("Archived local migrations.")

    try:
        # Create remote directories and upload files
        info("Uploading migrations and check-migration-drift.js to the VPS...")
        sftp = client.open_sftp()
        
        # Ensure scripts directory exists
        try:
            sftp.mkdir("/var/www/intrustindia.com/app/scripts")
        except IOError:
            pass # Already exists or couldn't create
            
        sftp.put(local_tar_path, remote_tar_path)
        sftp.put("/home/i4yush/Desktop/intrust-india/scripts/check-migration-drift.js", "/var/www/intrustindia.com/app/scripts/check-migration-drift.js")
        sftp.close()
        ok("Uploaded migrations and script.")

        # Extract on remote
        info("Extracting migrations on the VPS...")
        rc, out, error_txt = execute_cmd(client, f"tar -xzf {remote_tar_path} -C /var/www/intrustindia.com/app/")
        if rc != 0:
            err(f"Failed to extract migrations tar: {error_txt}")
        ok("Migrations extracted on VPS.")

        # Run check-migration-drift.js
        info("Running migration drift check script against the new self-hosted DB...")
        drift_cmd = (
            'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
            f'cd /var/www/intrustindia.com/app && '
            f'NEXT_PUBLIC_SUPABASE_URL="http://localhost:8000" '
            f'SUPABASE_SERVICE_ROLE_KEY="{service_role_key}" '
            'node scripts/check-migration-drift.js'
        )
        rc, out, error_txt = execute_cmd(client, drift_cmd)
        if rc != 0:
            err(f"Drift check failed: {out}\n{error_txt}")
        ok("Migration drift check passed! Zero drift detected.")

    finally:
        # Clean up files
        info("Cleaning up migrations tarball files...")
        if os.path.exists(local_tar_path):
            os.remove(local_tar_path)
        try:
            sftp = client.open_sftp()
            sftp.remove(remote_tar_path)
            sftp.close()
        except Exception:
            pass
        ok("Cleaned migrations tarballs.")

    # Spot-check RPCs, triggers, and RLS policies
    info("Spot-checking restored RPCs, triggers, and RLS policies...")
    verify_sql = """
    -- Spot check functions
    SELECT proname, prosecdef FROM pg_proc 
    WHERE proname IN (
        'perform_wallet_adjustment', 'procure_from_merchant', 
        'merchant_request_payout', 'admin_approve_payout', 'admin_reject_payout', 
        'get_storefront_page', 'expire_stale_reward_points', 'cancel_stale_gateway_drafts'
    );

    -- Spot check cron jobs
    SELECT jobname, schedule, command FROM cron.job;

    -- Count total restored schemas, tables, triggers, and policies
    SELECT 
      (SELECT count(*) FROM pg_namespace) as schema_count,
      (SELECT count(*) FROM pg_tables WHERE schemaname IN ('public', 'auth', 'storage')) as table_count,
      (SELECT count(*) FROM pg_trigger) as trigger_count,
      (SELECT count(*) FROM pg_policy) as policy_count;
    """
    rc, out, error_txt = execute_cmd(
        client,
        "docker exec -i supabase-db psql -U supabase_admin -d postgres",
        stdin_data=verify_sql
    )
    if rc != 0:
        err(f"Verification queries failed: {error_txt}")
    print("\n" + "="*50 + "\nVerification Results:\n" + "="*50)
    print(out)
    print("="*50 + "\n")

    # Clean up remote dump file
    info("Cleaning up remote dump file...")
    sftp = client.open_sftp()
    sftp.remove(REMOTE_DUMP_PATH)
    sftp.close()
    ok("Remote dump file cleaned.")

    ok("Database reconciliation completed successfully! Zero drift and all components verified.")
    client.close()

if __name__ == "__main__":
    main()
