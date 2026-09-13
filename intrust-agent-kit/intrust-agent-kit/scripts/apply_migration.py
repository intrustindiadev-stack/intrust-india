"""
apply_migration.py — apply a specific .sql migration file to the VPS Supabase DB.

Usage:
    python scripts/apply_migration.py <path-or-filename>

Examples:
    # Provide a full path
    python scripts/apply_migration.py supabase/migrations/20260904_my_change.sql

    # Or just the filename if it lives in supabase/migrations/
    python scripts/apply_migration.py 20260904_my_change.sql
"""

import os
import sys
from vps_config import get_ssh_client, SUPABASE_CONTAINER, PG_ADMIN_ROLE

def apply_migration(migration_path: str):
    if not os.path.isabs(migration_path):
        # Try relative to workspace root (one level up from scripts/)
        workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        candidates = [
            migration_path,
            os.path.join(workspace_root, migration_path),
            os.path.join(workspace_root, "supabase", "migrations", os.path.basename(migration_path)),
        ]
        for c in candidates:
            if os.path.exists(c):
                migration_path = c
                break
        else:
            print(f"ERROR: Could not find migration file: {migration_path}")
            sys.exit(1)

    mig_file = os.path.basename(migration_path)
    remote_path = f"/tmp/{mig_file}"

    print(f"Connecting to VPS...")
    client = get_ssh_client()
    try:
        sftp = client.open_sftp()
        print(f"Uploading {mig_file} ...")
        sftp.put(migration_path, remote_path)
        sftp.close()

        print(f"Applying {mig_file} ...")
        cmd = f"cat {remote_path} | docker exec -i {SUPABASE_CONTAINER} psql -U {PG_ADMIN_ROLE} -d postgres"
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")

        if out.strip():
            print(out.strip())
        if err.strip():
            print("STDERR:", err.strip())

        client.exec_command(f"rm {remote_path}")
        print(f"✅ Migration applied successfully: {mig_file}")
    finally:
        client.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    apply_migration(sys.argv[1])
