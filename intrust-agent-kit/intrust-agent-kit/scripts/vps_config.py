"""
Central VPS connection configuration for Intrust India.
All scripts import from here — update credentials in one place.

Architecture:
  - Production DB runs inside Docker on the VPS (port NOT exposed to internet)
  - You MUST go through SSH (paramiko) to reach it
  - DO NOT use supabase db push, standard psql URIs, or direct TCP connections
"""

VPS_HOST     = "187.124.98.130"
VPS_USER     = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT     = 22

# Docker container name for the Supabase PostgreSQL instance
SUPABASE_CONTAINER = "supabase-db"

# PostgreSQL roles
PG_ADMIN_ROLE = "supabase_admin"   # use for migrations (has auth schema access)
PG_ROLE       = "postgres"          # use for general queries

# Project paths on VPS
VPS_PROJECT_DIR = "/home/intrustindia/intrust-india"

# ── Helpers ──────────────────────────────────────────────────────────────────

import paramiko

def get_ssh_client() -> paramiko.SSHClient:
    """Return a connected and ready SSH client. Caller must close it."""
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    return c


def exec_sql(sql: str, role: str = PG_ROLE) -> tuple[str, str]:
    """
    Execute a SQL string against the VPS Supabase DB via SSH.
    Returns (stdout, stderr) as decoded strings.
    """
    client = get_ssh_client()
    try:
        sftp = client.open_sftp()
        with sftp.file("/tmp/_agent_query.sql", "w") as f:
            f.write(sql)
        sftp.close()

        cmd = f"cat /tmp/_agent_query.sql | docker exec -i {SUPABASE_CONTAINER} psql -U {role} -d postgres"
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        client.exec_command("rm /tmp/_agent_query.sql")
        return out, err
    finally:
        client.close()


def exec_vps_cmd(cmd: str) -> tuple[str, str]:
    """Run an arbitrary shell command on the VPS. Returns (stdout, stderr)."""
    client = get_ssh_client()
    try:
        _, stdout, stderr = client.exec_command(cmd)
        return (
            stdout.read().decode("utf-8", errors="replace"),
            stderr.read().decode("utf-8", errors="replace"),
        )
    finally:
        client.close()
