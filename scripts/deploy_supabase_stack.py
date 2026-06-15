#!/usr/bin/env python3
"""
deploy_supabase_stack.py
========================
Deploys the trimmed Supabase Docker stack to the InTrust India VPS.

Uses paramiko (password-based SSH) — same pattern as deploy_vps.py.

Usage:
    python3 scripts/deploy_supabase_stack.py

Requirements:
    pip install paramiko   (already installed on this machine)

What this does:
  Phase 1 — Generate secrets (JWT_SECRET, POSTGRES_PASSWORD, JWTs, etc.)
  Phase 2 — Build the populated .env file from the template
  Phase 3 — VPS bootstrap: Docker CE, 4 GB swap
  Phase 4 — Clone upstream Supabase docker/ volumes on the VPS
  Phase 5 — Upload docker-compose.yml, .env, extension SQL
  Phase 6 — docker compose up -d
  Phase 7 — Health checks (Postgres, Auth, Kong, Storage)
  Phase 8 — Print summary with keys
"""

import os, sys, time, hmac, hashlib, base64, json, secrets, subprocess, textwrap

# ─── VPS Config ───────────────────────────────────────────────────────────────
VPS_HOST     = os.environ.get("VPS_HOST")
VPS_USER     = os.environ.get("VPS_USER", "intrustindia")
VPS_PASSWORD = os.environ.get("VPS_PASSWORD")
VPS_PORT     = int(os.environ.get("VPS_PORT", "22"))
REMOTE_DIR   = "/var/www/intrustindia.com/supabase-stack"

if not VPS_HOST or not VPS_PASSWORD:
    print("\n[ERROR] Missing required environment variables: VPS_HOST, VPS_PASSWORD", file=sys.stderr)
    print("Example: VPS_HOST=187.124.98.130 VPS_PASSWORD=your_pass python3 scripts/deploy_supabase_stack.py\n", file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STACK_DIR  = os.path.join(SCRIPT_DIR, "supabase-stack")

# ─── Helpers ──────────────────────────────────────────────────────────────────
CYAN = "\033[0;36m"; GREEN = "\033[0;32m"; YELLOW = "\033[1;33m"
RED  = "\033[0;31m"; BOLD  = "\033[1m";    RESET  = "\033[0m"

def header(msg): print(f"\n{BOLD}{CYAN}═══ {msg} ═══{RESET}")
def info(msg):   print(f"{CYAN}[INFO]{RESET} {msg}")
def ok(msg):     print(f"{GREEN}[OK]{RESET} {msg}")
def warn(msg):   print(f"{YELLOW}[WARN]{RESET} {msg}")
def err(msg):    print(f"{RED}[ERROR]{RESET} {msg}", file=sys.stderr); sys.exit(1)


# ─── SSH helpers ──────────────────────────────────────────────────────────────
def ssh_connect():
    import paramiko
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD,
              timeout=30, allow_agent=False, look_for_keys=False)
    return c


def run(client, cmd, timeout=300, exit_on_fail=True, print_output=True):
    """Run a command on the VPS and return stdout+stderr."""
    _, sout, serr = client.exec_command(cmd, timeout=timeout, get_pty=False)
    out  = sout.read().decode("utf-8", errors="replace").strip()
    serr_txt = serr.read().decode("utf-8", errors="replace").strip()
    rc   = sout.channel.recv_exit_status()
    combined = out
    if serr_txt:
        combined += ("\n" + serr_txt)
    if print_output and combined:
        print(combined)
    if rc != 0 and exit_on_fail:
        err(f"Command failed (rc={rc}): {cmd[:120]}")
    return combined, rc


def sudo_run(client, cmd, timeout=300, exit_on_fail=True, print_output=True):
    """Run a command on the VPS with sudo (password via stdin)."""
    # Use echo password | sudo -S -p '' bash -c 'cmd'
    # -p '' suppresses the sudo password prompt from appearing in output
    escaped = cmd.replace("'", "'\"'\"'")
    full = f"echo '{VPS_PASSWORD}' | sudo -S -p '' bash -c '{escaped}'"
    return run(client, full, timeout=timeout, exit_on_fail=exit_on_fail, print_output=print_output)


def scp_file(client, local_path, remote_path):
    """Upload a single file via SFTP."""
    sftp = client.open_sftp()
    # Ensure remote directory exists
    remote_dir = os.path.dirname(remote_path)
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        # Create dirs one level at a time
        parts = remote_dir.split("/")
        for i in range(2, len(parts)+1):
            p = "/".join(parts[:i])
            try: sftp.mkdir(p)
            except: pass
    sftp.put(local_path, remote_path)
    sftp.close()
    info(f"Uploaded: {os.path.basename(local_path)} → {remote_path}")


# ─── JWT generation ──────────────────────────────────────────────────────────
def make_jwt(role: str, secret: str) -> str:
    """Generate an HS256 JWT signed with secret, 10-year expiry."""
    header_b64  = base64.urlsafe_b64encode(
        json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",",":")).encode()
    ).rstrip(b"=").decode()

    now = int(time.time())
    payload = {"role": role, "iss": "supabase", "iat": now,
               "exp": now + 10 * 365 * 24 * 3600}
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",",":")).encode()
    ).rstrip(b"=").decode()

    msg = f"{header_b64}.{payload_b64}".encode()
    sig = base64.urlsafe_b64encode(
        hmac.new(secret.encode(), msg, hashlib.sha256).digest()
    ).rstrip(b"=").decode()

    return f"{header_b64}.{payload_b64}.{sig}"


# ─── PHASE 1: Generate secrets ───────────────────────────────────────────────
def phase1_secrets():
    header("PHASE 1 — Generate Secrets")

    pg_pass       = secrets.token_hex(24)
    jwt_secret    = secrets.token_hex(40)
    dash_pass     = secrets.token_hex(16)
    secret_key    = secrets.token_hex(64)
    pg_meta_key   = secrets.token_urlsafe(24)[:32]
    vault_key     = secrets.token_urlsafe(24)[:32]
    s3_key_id     = secrets.token_hex(16)
    s3_key_secret = secrets.token_hex(32)

    anon_key          = make_jwt("anon", jwt_secret)
    service_role_key  = make_jwt("service_role", jwt_secret)

    info(f"JWT_SECRET (first 8): {jwt_secret[:8]}...")
    info(f"ANON_KEY   (first 30): {anon_key[:30]}...")
    info(f"SERVICE_ROLE_KEY (30): {service_role_key[:30]}...")
    ok("Secrets generated.")

    return {
        "POSTGRES_PASSWORD": pg_pass,
        "JWT_SECRET":        jwt_secret,
        "ANON_KEY":          anon_key,
        "SERVICE_ROLE_KEY":  service_role_key,
        "DASHBOARD_PASSWORD": dash_pass,
        "SECRET_KEY_BASE":   secret_key,
        "PG_META_CRYPTO_KEY": pg_meta_key,
        "VAULT_ENC_KEY":     vault_key,
        "S3_KEY_ID":         s3_key_id,
        "S3_KEY_SECRET":     s3_key_secret,
    }


# ─── PHASE 2: Build .env ─────────────────────────────────────────────────────
def phase2_env(secrets_map: dict) -> str:
    header("PHASE 2 — Build .env File")
    template_path = os.path.join(STACK_DIR, ".env.template")
    env_path      = os.path.join(STACK_DIR, ".env")

    with open(template_path) as f:
        content = f.read()

    replacements = {
        "REPLACE_POSTGRES_PASSWORD": secrets_map["POSTGRES_PASSWORD"],
        "REPLACE_JWT_SECRET":        secrets_map["JWT_SECRET"],
        "REPLACE_ANON_KEY":          secrets_map["ANON_KEY"],
        "REPLACE_SERVICE_ROLE_KEY":  secrets_map["SERVICE_ROLE_KEY"],
        "REPLACE_DASHBOARD_PASSWORD": secrets_map["DASHBOARD_PASSWORD"],
        "REPLACE_SECRET_KEY_BASE":   secrets_map["SECRET_KEY_BASE"],
        "REPLACE_PG_META_CRYPTO_KEY": secrets_map["PG_META_CRYPTO_KEY"],
        "REPLACE_VAULT_ENC_KEY":     secrets_map["VAULT_ENC_KEY"],
        "REPLACE_S3_KEY_ID":         secrets_map["S3_KEY_ID"],
        "REPLACE_S3_KEY_SECRET":     secrets_map["S3_KEY_SECRET"],
    }

    for placeholder, value in replacements.items():
        if placeholder not in content:
            warn(f"Placeholder not found in template: {placeholder}")
        content = content.replace(placeholder, value)

    # Final check
    remaining = [k for k in replacements if k in content]
    if remaining:
        err(f"Unreplaced placeholders: {remaining}")

    with open(env_path, "w") as f:
        f.write(content)
    os.chmod(env_path, 0o600)
    ok(f".env written to {env_path}")

    # Save local secrets backup
    secrets_file = os.path.join(SCRIPT_DIR, "supabase-stack-secrets.txt")
    with open(secrets_file, "w") as f:
        f.write(f"# Supabase Stack Secrets — {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\n")
        f.write("# DO NOT COMMIT THIS FILE\n\n")
        f.write(f"VPS_HOST={VPS_HOST}\n")
        for k, v in secrets_map.items():
            f.write(f"{k}={v}\n")
        f.write("DASHBOARD_USERNAME=supabase\n")
    os.chmod(secrets_file, 0o600)
    ok(f"Secrets backed up: {secrets_file}")

    return env_path


# ─── PHASE 3: VPS Bootstrap ──────────────────────────────────────────────────
def phase3_bootstrap(client):
    header("PHASE 3 — VPS Bootstrap (Docker + Swap)")

    # Check OS
    out, _ = run(client, "cat /etc/os-release | grep PRETTY_NAME")
    info(f"VPS OS: {out}")

    # Install Docker if missing (use sudo since we're not root)
    out, rc = run(client, f"echo '{VPS_PASSWORD}' | sudo -S -p '' docker --version 2>/dev/null",
                  exit_on_fail=False, print_output=False)
    if rc != 0:
        info("Installing Docker CE...")
        docker_install = textwrap.dedent("""\
            export DEBIAN_FRONTEND=noninteractive
            apt-get update -qq
            apt-get install -y -qq ca-certificates curl gnupg lsb-release git
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            chmod a+r /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
            apt-get update -qq
            apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            systemctl enable --now docker
        """)
        sudo_run(client, f"bash -c '{docker_install}'", timeout=300)
        out, _ = sudo_run(client, "docker --version")
        ok(f"Docker installed: {out}")
    else:
        ok(f"Docker already installed: {out.strip()}")

    # Add user to docker group if needed
    sudo_run(client, f"usermod -aG docker {VPS_USER} 2>/dev/null || true", exit_on_fail=False, print_output=False)

    # 4 GB Swap
    swap_mb, _ = run(client, "free -m | awk '/^Swap:/{print $2}'", print_output=False)
    swap_mb = int(swap_mb.strip() or "0")
    if swap_mb < 3800:
        info(f"Setting up 4 GB swap (current: {swap_mb} MB)...")
        swap_cmd = textwrap.dedent("""\
            if [ ! -f /swapfile ]; then
                fallocate -l 4G /swapfile
                chmod 600 /swapfile
                mkswap /swapfile
            fi
            swapon /swapfile 2>/dev/null || true
            grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
            printf 'vm.swappiness=10\nvm.vfs_cache_pressure=50\n' > /etc/sysctl.d/99-supabase-swap.conf
            sysctl -p /etc/sysctl.d/99-supabase-swap.conf
        """)
        sudo_run(client, f"bash -c '{swap_cmd}'", timeout=60)
        swap_now, _ = run(client, "free -h | awk '/^Swap:/{print $2}'", print_output=False)
        ok(f"Swap active: {swap_now.strip()}")
    else:
        ok(f"Swap already sufficient: {swap_mb} MB")

    # Create target directory (needs sudo for /var/www)
    sudo_run(client, f"mkdir -p {REMOTE_DIR}/volumes/db/init {REMOTE_DIR}/volumes/snippets {REMOTE_DIR}/volumes/functions && chown -R {VPS_USER}:{VPS_USER} /var/www/intrustindia.com/supabase-stack",
        print_output=False)
    ok(f"Remote directory ready: {REMOTE_DIR}")


# ─── PHASE 4: Clone upstream Supabase volumes ────────────────────────────────
def phase4_clone_upstream(client):
    header("PHASE 4 — Clone Upstream Supabase Docker Volumes")

    # Check if already done
    out, rc = run(client, f"test -f {REMOTE_DIR}/volumes/db/roles.sql && echo DONE || echo MISSING",
                  print_output=False)
    if "DONE" in out:
        ok("Upstream volumes already present, skipping clone.")
        return

    info("Cloning supabase/supabase (sparse, docker/ dir only)...")
    clone_cmd = (
        f"TMP=$(mktemp -d) && cd \"$TMP\" && "
        f"git clone --depth=1 --filter=blob:none --sparse https://github.com/supabase/supabase.git supabase-src && "
        f"cd supabase-src && git sparse-checkout set docker && "
        f"cp -r docker/volumes {REMOTE_DIR}/ && "
        f"rm -rf \"$TMP\" && echo 'Clone complete'"
    )
    run(client, clone_cmd, timeout=300)
    ok("Upstream Supabase volumes cloned.")


# ─── PHASE 5: Upload our config files ────────────────────────────────────────
def phase5_upload(client, env_path):
    header("PHASE 5 — Upload Config Files")

    # Ensure the kong-entrypoint.sh is present (from upstream clone)
    out, rc = run(client,
        f"test -f {REMOTE_DIR}/volumes/api/kong-entrypoint.sh && echo YES || echo NO",
        print_output=False)
    if "NO" in out:
        warn("kong-entrypoint.sh missing from upstream clone — fetching directly...")
        fetch_kong = textwrap.dedent(f"""\
            mkdir -p {REMOTE_DIR}/volumes/api
            curl -fsSL https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/api/kong.yml \\
                -o {REMOTE_DIR}/volumes/api/kong.yml
            curl -fsSL https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/api/kong-entrypoint.sh \\
                -o {REMOTE_DIR}/volumes/api/kong-entrypoint.sh
            chmod +x {REMOTE_DIR}/volumes/api/kong-entrypoint.sh
        """)
        run(client, f"bash -s <<'KONGEOF'\n{fetch_kong}\nKONGEOF", timeout=60)
        ok("Kong config fetched.")

    # Also fetch the standard DB init SQL files if missing
    db_files_cmd = textwrap.dedent(f"""\
        BASE=https://raw.githubusercontent.com/supabase/supabase/master/docker/volumes/db
        FILES="realtime.sql webhooks.sql roles.sql jwt.sql logs.sql pooler.sql _supabase.sql"
        mkdir -p {REMOTE_DIR}/volumes/db
        for f in $FILES; do
            if [ ! -f "{REMOTE_DIR}/volumes/db/$f" ]; then
                echo "Fetching $f..."
                curl -fsSL "$BASE/$f" -o "{REMOTE_DIR}/volumes/db/$f"
            fi
        done
        # Also fetch init/data.sql if missing
        mkdir -p {REMOTE_DIR}/volumes/db/init
        if [ ! -f "{REMOTE_DIR}/volumes/db/init/data.sql" ]; then
            curl -fsSL "$BASE/init/data.sql" -o "{REMOTE_DIR}/volumes/db/init/data.sql" 2>/dev/null || \\
            touch {REMOTE_DIR}/volumes/db/init/data.sql
        fi
    """)
    run(client, f"bash -s <<'DBEOF'\n{db_files_cmd}\nDBEOF", timeout=120)

    # Upload our trimmed docker-compose.yml
    scp_file(client,
             os.path.join(STACK_DIR, "docker-compose.yml"),
             f"{REMOTE_DIR}/docker-compose.yml")

    # Upload populated .env
    scp_file(client, env_path, f"{REMOTE_DIR}/.env")
    # Lock it down on the VPS
    run(client, f"chmod 600 {REMOTE_DIR}/.env", print_output=False)

    # Upload our extension init SQL
    scp_file(client,
             os.path.join(STACK_DIR, "volumes", "db", "init", "99-extensions.sql"),
             f"{REMOTE_DIR}/volumes/db/init/99-extensions.sql")

    # Upload fix-init SQL
    scp_file(client,
             os.path.join(STACK_DIR, "volumes", "db", "init", "98-fix-init.sql"),
             f"{REMOTE_DIR}/volumes/db/init/98-fix-init.sql")

    ok("All config files uploaded.")


# ─── PHASE 6: Docker Compose Up ──────────────────────────────────────────────
def phase6_compose_up(client):
    header("PHASE 6 — Bring Up the Stack")

    info("Running preflight check for mounted files...")
    preflight_cmd = textwrap.dedent("""\
        set -e
        cd {REMOTE_DIR}
        MISSING=0
        # Parse docker-compose.yml for bind mounts pointing to ./volumes
        FILES=$(grep -E '^\s*-\s*\./volumes/.*\:[^:]*$' docker-compose.yml | awk -F':' '{print $1}' | sed 's/^[ \t]*- \.\///')
        for f in $FILES; do
            if [ ! -f "$f" ]; then
                echo "[ERROR] Missing bound file: $f"
                MISSING=1
            fi
        done
        if [ $MISSING -eq 1 ]; then exit 1; fi
        echo "[OK] All bound files exist."
    """).format(REMOTE_DIR=REMOTE_DIR)
    sudo_run(client, f"bash -c '{preflight_cmd}'", timeout=60)
    ok("Preflight check passed.")

    info("Pulling images (may take a few minutes on first run)...")
    sudo_run(client, f"cd {REMOTE_DIR} && docker compose pull", timeout=600)
    ok("Images pulled.")

    info("Starting services (docker compose up -d)...")
    sudo_run(client, f"cd {REMOTE_DIR} && docker compose up -d", timeout=180)
    ok("Stack started.")

    # Show status
    sudo_run(client, f"cd {REMOTE_DIR} && docker compose ps")


# ─── PHASE 7: Health Checks ──────────────────────────────────────────────────
def wait_healthy(client, container, max_wait=120):
    """Poll until container is healthy or running."""
    print(f"  Waiting for {container}", end="", flush=True)
    for _ in range(max_wait // 3):
        out, _ = sudo_run(client,
            f"docker inspect --format='{{{{.State.Health.Status}}}}' {container} 2>/dev/null || echo missing",
            print_output=False, exit_on_fail=False)
        status = out.strip().strip("'")
        if status == "healthy":
            print(f" ✓ healthy")
            return True
        elif status == "unhealthy":
            print(f" ✗ UNHEALTHY")
            sudo_run(client, f"docker logs --tail=30 {container}", exit_on_fail=False)
            return False
        elif status == "missing":
            print(f" ✗ MISSING")
            return False
        print(".", end="", flush=True)
        time.sleep(3)

    # No healthcheck → just check running
    out, _ = sudo_run(client,
        f"docker inspect --format='{{{{.State.Running}}}}' {container} 2>/dev/null || echo false",
        print_output=False, exit_on_fail=False)
    if out.strip().strip("'") == "true":
        print(f" ~ running (no healthcheck)")
        return True
    print(f" ✗ TIMEOUT")
    return False


def phase7_health(client, secrets_map):
    header("PHASE 7 — Health Checks")

    all_ok = True
    for container, wait in [
        ("supabase-db",                     120),
        ("supabase-auth",                    90),
        ("supabase-kong",                    90),
        ("realtime-dev.supabase-realtime",   90),
        ("supabase-storage",                 60),
        ("supabase-imgproxy",                30),
    ]:
        if not wait_healthy(client, container, wait):
            all_ok = False

    anon_key = secrets_map["ANON_KEY"]

    print()
    info("Testing Kong REST endpoint...")
    out, rc = run(client,
        f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:8000/rest/v1/"
        f" -H 'apikey: {anon_key}' -H 'Authorization: Bearer {anon_key}'",
        print_output=False, exit_on_fail=False)
    http_code = out.strip().strip("'")
    if http_code in ("200", "400"):
        ok(f"Kong /rest/v1/ → HTTP {http_code}")
    else:
        warn(f"Kong /rest/v1/ → HTTP {http_code} (may need a moment)")

    info("Testing Auth /health...")
    out, rc = run(client,
        f"curl -s http://127.0.0.1:8000/auth/v1/health -H 'apikey: {anon_key}'",
        print_output=False, exit_on_fail=False)
    if '"status":"alive"' in out or '"status": "alive"' in out:
        ok("Auth health → alive")
    else:
        warn(f"Auth health response: {out[:80]}")

    info("Checking installed Postgres extensions...")
    sudo_run(client,
        "docker exec supabase-db psql -U postgres -c "
        "\"SELECT extname, extversion FROM pg_extension WHERE extname IN "
        "('pgcrypto','uuid-ossp','pg_cron','pg_stat_statements','supabase_vault','pg_net') ORDER BY extname;\"",
        exit_on_fail=False)

    print()
    info("Memory usage:")
    sudo_run(client, 'docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"',
        exit_on_fail=False)

    return all_ok


# ─── PHASE 8: Summary ────────────────────────────────────────────────────────
def phase8_summary(secrets_map):
    header("PHASE 8 — Summary")
    anon  = secrets_map["ANON_KEY"]
    svc   = secrets_map["SERVICE_ROLE_KEY"]
    dash  = secrets_map["DASHBOARD_PASSWORD"]
    print(f"""
{BOLD}╔═══════════════════════════════════════════════════════════════╗
║  Supabase Stack — Deployment Complete                         ║
╠═══════════════════════════════════════════════════════════════╣{RESET}
  {CYAN}VPS:{RESET}              {VPS_HOST}
  {CYAN}Stack dir:{RESET}        {REMOTE_DIR}
  {CYAN}Kong (internal):{RESET}  http://127.0.0.1:8000
  {CYAN}Public URL:{RESET}       https://intrustindia.com  (after Nginx setup)

  {CYAN}ANON_KEY:{RESET}
    {anon[:60]}...

  {CYAN}SERVICE_ROLE_KEY:{RESET}
    {svc[:60]}...

  {CYAN}Dashboard:{RESET}        user=supabase  pass={dash}
  {CYAN}Secrets file:{RESET}     scripts/supabase-stack-secrets.txt

  {YELLOW}Next steps:{RESET}
   1. Configure Nginx to proxy /  →  http://127.0.0.1:8000 (Kong)
   2. Update Next.js .env with new ANON_KEY + SERVICE_ROLE_KEY
   3. Run migrations: psql -h {VPS_HOST} -U postgres -d postgres
   4. Studio access (SSH tunnel):
      ssh -L 3001:localhost:3000 {VPS_USER}@{VPS_HOST}
      docker compose -f {REMOTE_DIR}/docker-compose.yml --profile tools up -d

{BOLD}╚═══════════════════════════════════════════════════════════════╝{RESET}
""")


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{BOLD}{CYAN}{'═'*60}")
    print("  Supabase Self-Hosted Stack — VPS Deployment")
    print(f"  Target: {VPS_HOST}  ({REMOTE_DIR})")
    print(f"{'═'*60}{RESET}")

    # Phase 1: Generate secrets (no VPS needed)
    secrets_map = phase1_secrets()

    # Phase 2: Build .env (no VPS needed)
    env_path = phase2_env(secrets_map)

    # Connect to VPS
    header("Connecting to VPS")
    try:
        import paramiko
    except ImportError:
        err("paramiko not installed. Run: pip install paramiko")

    info(f"Connecting to {VPS_USER}@{VPS_HOST}...")
    client = ssh_connect()
    ok(f"Connected to {VPS_HOST}")

    try:
        phase3_bootstrap(client)
        phase4_clone_upstream(client)
        phase5_upload(client, env_path)
        phase6_compose_up(client)

        info("Waiting 15s for containers to initialise...")
        time.sleep(15)

        all_healthy = phase7_health(client, secrets_map)
        if not all_healthy:
            warn("Some containers did not reach healthy state. Check logs above.")

    finally:
        client.close()

    phase8_summary(secrets_map)


if __name__ == "__main__":
    main()
