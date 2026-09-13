"""
apply_recent_migrations.py — auto-detect and apply all unapplied local migrations.

This script compares local supabase/migrations/*.sql files against the list of
already-applied migrations on the VPS and applies any that are missing.

Usage:
    python scripts/apply_recent_migrations.py [--since YYYYMMDDHHMMSS]

    --since   Only consider migrations with a timestamp >= this value.
              Defaults to applying ALL local migrations not yet on the VPS.

Example:
    python scripts/apply_recent_migrations.py --since 20260901000000
"""

import os
import sys
import argparse
from vps_config import get_ssh_client, SUPABASE_CONTAINER, PG_ADMIN_ROLE

def get_applied_migrations(client) -> set:
    """Fetch the list of migrations already recorded in supabase_migrations table."""
    cmd = (
        "docker exec supabase-db psql -U postgres -d postgres -t -A "
        "-c \"SELECT name FROM supabase_migrations.schema_migrations ORDER BY name;\""
    )
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    # If table doesn't exist or empty, return empty set
    return set(line.strip() for line in out.splitlines() if line.strip())


def apply_recent_migrations(since: str = ""):
    workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    migrations_dir = os.path.join(workspace_root, "supabase", "migrations")

    if not os.path.isdir(migrations_dir):
        print(f"ERROR: migrations directory not found at {migrations_dir}")
        sys.exit(1)

    all_local = sorted(f for f in os.listdir(migrations_dir) if f.endswith(".sql"))

    if since:
        candidates = [f for f in all_local if f >= since]
    else:
        candidates = all_local

    if not candidates:
        print("No migration files found matching criteria.")
        return

    print(f"Connecting to VPS (checking {len(candidates)} local migration files)...")
    client = get_ssh_client()
    try:
        applied = get_applied_migrations(client)
        # Strip .sql from applied names for comparison
        applied_names = set(n.rstrip(".sql") if n.endswith(".sql") else n for n in applied)

        to_apply = []
        for f in candidates:
            name = f[:-4]  # strip .sql
            if name not in applied_names and f not in applied:
                to_apply.append(f)

        if not to_apply:
            print("✅ All local migrations are already applied on VPS.")
            return

        print(f"Found {len(to_apply)} migration(s) to apply: {to_apply}")

        sftp = client.open_sftp()
        for mig_file in to_apply:
            local_path = os.path.join(migrations_dir, mig_file)
            remote_path = f"/tmp/{mig_file}"

            print(f"\n→ Uploading {mig_file}...")
            sftp.put(local_path, remote_path)

            print(f"  Applying...")
            cmd = f"cat {remote_path} | docker exec -i {SUPABASE_CONTAINER} psql -U {PG_ADMIN_ROLE} -d postgres"
            _, stdout, stderr = client.exec_command(cmd)
            out = stdout.read().decode("utf-8", errors="replace")
            err = stderr.read().decode("utf-8", errors="replace")

            if out.strip():
                print(out.strip())
            if err.strip():
                print("  STDERR:", err.strip())

            client.exec_command(f"rm {remote_path}")
            print(f"  ✅ Done: {mig_file}")

        sftp.close()
        print("\n✅ All migrations applied successfully.")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--since", default="", help="Only apply migrations with timestamp >= this value (format: YYYYMMDDHHMMSS)")
    args = parser.parse_args()
    apply_recent_migrations(since=args.since)
