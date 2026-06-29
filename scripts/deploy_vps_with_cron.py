"""
InTrust India - Deploy + install morning-greeting cron
======================================================
1. Runs the standard deploy pipeline (build → pack → upload → deploy → verify → cleanup).
2. After deploy, SSHes back in to install the morning-greeting cron entry at 02:30 UTC
   (= 08:00 IST) if it isn't already there.
"""

import os
import sys
import time
import tarfile
import hashlib
import subprocess

# ──────────────────────────────────────────────
#  CONFIG
# ──────────────────────────────────────────────
VPS_HOST       = "187.124.98.130"
VPS_USER       = "intrustindia"
VPS_PASSWORD   = "Intrustdev@2026"
VPS_PORT       = 22

PROJECT_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAR_NAME       = "build.tar.gz"
LOCAL_TAR      = os.path.join(PROJECT_DIR, TAR_NAME)
REMOTE_UPLOAD  = f"/var/www/intrustindia.com/{TAR_NAME}"
REMOTE_APP_DIR = "/var/www/intrustindia.com/app"

INCLUDE_PATHS  = [".next", "public", "package.json", "package-lock.json", "next.config.mjs"]
EXCLUDE_DIRS   = [".next/dev"]


def divider(title):
    print(f"\n{'=' * 55}")
    print(f"  {title}")
    print(f"{'=' * 55}")


# ──────────────────────────────────────────────
#  STEP 1: BUILD LOCALLY
# ──────────────────────────────────────────────
def build_local():
    divider("STEP 1 - Building locally (npm run build)")
    print(f"Project dir: {PROJECT_DIR}")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=PROJECT_DIR,
        shell=(os.name == 'nt')
    )
    if result.returncode != 0:
        print("\n[ERROR] Local build failed. Aborting.")
        sys.exit(1)
    print("\n[OK] Local build succeeded.")


# ──────────────────────────────────────────────
#  STEP 2: PACKAGE BUILD INTO TAR.GZ
# ──────────────────────────────────────────────
def pack_build():
    divider("STEP 2 - Packing build.tar.gz")

    if os.path.exists(LOCAL_TAR):
        os.remove(LOCAL_TAR)

    print(f"Packing: {', '.join(INCLUDE_PATHS)}")
    print(f"Excluding: {', '.join(EXCLUDE_DIRS)}")

    with tarfile.open(LOCAL_TAR, "w:gz") as tar:
        for path in INCLUDE_PATHS:
            full = os.path.join(PROJECT_DIR, path)
            if not os.path.exists(full):
                print(f"  [WARN] Skipping missing path: {path}")
                continue

            def exclude_filter(tarinfo):
                for excl in EXCLUDE_DIRS:
                    if tarinfo.name.startswith(excl):
                        return None
                return tarinfo

            print(f"  Adding: {path}")
            tar.add(full, arcname=path, filter=exclude_filter)

    size_mb = os.path.getsize(LOCAL_TAR) / (1024 * 1024)
    print(f"\n[OK] Created {TAR_NAME} ({size_mb:.1f} MB)")


# ──────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────
def md5_file(filepath):
    h = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def ssh_connect():
    import paramiko
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD,
              timeout=30, allow_agent=False, look_for_keys=False)
    return c


def run_remote(client, cmd, timeout=120, exit_on_fail=True):
    NVM = 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
    full = f'bash -c \'{NVM}; {cmd}\''
    _, sout, serr = client.exec_command(full, timeout=timeout)
    status = sout.channel.recv_exit_status()
    out = sout.read().decode("utf-8", errors="replace").strip()
    err = serr.read().decode("utf-8", errors="replace").strip()
    combined = out + ("\n[STDERR] " + err if err else "")
    if combined:
        try:
            print(combined)
        except UnicodeEncodeError:
            print(combined.encode(sys.stdout.encoding or 'ascii', errors='replace').decode(sys.stdout.encoding or 'ascii'))
    if status != 0 and exit_on_fail:
        print(f"\n[ERROR] Command exited {status}: {cmd}")
        sys.exit(1)
    return combined


# ──────────────────────────────────────────────
#  STEP 3: UPLOAD TO VPS (with MD5 verify)
# ──────────────────────────────────────────────
def upload_tar(client):
    divider("STEP 3 - Uploading build.tar.gz to VPS")

    local_md5 = md5_file(LOCAL_TAR)
    print(f"Local  MD5: {local_md5}")

    sftp = client.open_sftp()
    size_mb = os.path.getsize(LOCAL_TAR) / (1024 * 1024)

    def progress(transferred, total):
        pct = (transferred / total) * 100
        sys.stdout.write(f"\r  Upload: {pct:.1f}%  ({transferred/(1024*1024):.1f}/{size_mb:.1f} MB)")
        sys.stdout.flush()

    print(f"Uploading {size_mb:.1f} MB to {REMOTE_UPLOAD} ...")
    sftp.put(LOCAL_TAR, REMOTE_UPLOAD, callback=progress)
    sftp.close()

    _, sout, _ = client.exec_command(f"md5sum {REMOTE_UPLOAD}")
    remote_md5 = sout.read().decode().strip().split()[0]
    print(f"\nRemote MD5: {remote_md5}")

    if local_md5 != remote_md5:
        print("[ERROR] MD5 mismatch — upload corrupted. Aborting.")
        sys.exit(1)

    print("[OK] Upload verified.")


# ──────────────────────────────────────────────
#  STEP 4: DEPLOY ON VPS (NO BUILD ON SERVER)
# ──────────────────────────────────────────────
def deploy_on_vps(client):
    divider("STEP 4 - Deploying on VPS (extract -> deps -> restart)")

    print("\n[4a] Extracting build.tar.gz...")
    run_remote(client, f"tar -xzf {REMOTE_UPLOAD} --overwrite -C {REMOTE_APP_DIR}")

    print("\n[4b] Installing production dependencies (no rebuild)...")
    run_remote(
        client,
        f"cd {REMOTE_APP_DIR} && npm install --omit=dev --prefer-offline --no-audit --no-fund",
        timeout=180
    )

    print("\n[4c] Restarting PM2 with safe memory limits...")
    run_remote(
        client,
        f'cd {REMOTE_APP_DIR} && NODE_OPTIONS="--max-old-space-size=512" nice -n 19 pm2 restart intrust-india --update-env',
        timeout=60
    )
    run_remote(client, "pm2 save", exit_on_fail=False)

    print("\n[OK] Application deployed and restarted.")


# ──────────────────────────────────────────────
#  STEP 5: VERIFY HEALTH
# ──────────────────────────────────────────────
def verify_health(client):
    divider("STEP 5 - Verifying health")

    print("Waiting 5s for app to boot...")
    time.sleep(5)

    print("\nPM2 Status:")
    run_remote(client, "pm2 list", exit_on_fail=False)

    print("\nHTTP Health (localhost:3000):")
    result = run_remote(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000", exit_on_fail=False)

    print(f"\nHTTP Response Code: {result}")
    if "200" in result or "301" in result or "302" in result:
        print("\n[OK] Site is UP and responding!")
    else:
        print(f"\n[WARN] Unexpected response. Checking PM2 logs:")
        run_remote(client, "pm2 logs intrust-india --lines 30 --nostream", exit_on_fail=False, timeout=30)

    print("\nPublic domain check:")
    run_remote(client, 'curl -s -o /dev/null -w "https://intrustindia.com -> HTTP %{http_code}" https://intrustindia.com', exit_on_fail=False)


# ──────────────────────────────────────────────
#  STEP 6: CLEANUP
# ──────────────────────────────────────────────
def cleanup(client):
    divider("STEP 6 - Cleanup")
    print("\n[6a] Removing local build.tar.gz...")
    if os.path.exists(LOCAL_TAR):
        os.remove(LOCAL_TAR)
        print("  Removed local tarball.")
    else:
        print("  Local tarball not found.")

    print("\n[6b] Removing remote build.tar.gz...")
    run_remote(client, f"rm -f {REMOTE_UPLOAD}", exit_on_fail=False)
    print("  Removed remote tarball.")


# ──────────────────────────────────────────────
#  STEP 7: INSTALL MORNING CRON ON VPS
# ──────────────────────────────────────────────
def install_morning_cron(client):
    """
    Installs the daily 08:00 IST (02:30 UTC) cron entry that calls:
      GET /api/cron/morning-greeting
    with the CRON_SECRET read from the app's .env on the VPS.

    Idempotent — checks for the marker string 'morning-greeting' before adding.
    """
    divider("STEP 7 - Installing morning-greeting cron on VPS")

    # 1. Read CRON_SECRET from the VPS .env file
    print("\n[7a] Reading CRON_SECRET from VPS environment...")
    secret_raw = run_remote(
        client,
        f"grep '^CRON_SECRET=' {REMOTE_APP_DIR}/.env.local 2>/dev/null || "
        f"grep '^CRON_SECRET=' {REMOTE_APP_DIR}/.env 2>/dev/null || echo 'NOT_FOUND'",
        exit_on_fail=False
    )
    secret_raw = secret_raw.strip()

    if secret_raw == "NOT_FOUND" or not secret_raw:
        print("[WARN] Could not find CRON_SECRET in VPS .env — cron will use placeholder.")
        cron_secret = "REPLACE_WITH_CRON_SECRET"
    else:
        # Extract value from KEY=VALUE line
        cron_secret = secret_raw.split("=", 1)[-1].strip().strip('"').strip("'")
        print(f"[OK] Found CRON_SECRET (length={len(cron_secret)} chars)")

    # 2. The cron line to install
    cron_line = (
        f"30 2 * * * curl -s -X GET https://intrustindia.com/api/cron/morning-greeting "
        f'-H "Authorization: Bearer {cron_secret}" '
        f">> /var/log/intrust-cron.log 2>&1"
        f"  # intrust-morning-greeting"
    )

    # 3. Check if already installed
    print("\n[7b] Checking existing crontab...")
    existing = run_remote(client, "crontab -l 2>/dev/null || true", exit_on_fail=False)

    if "morning-greeting" in existing:
        print("[OK] morning-greeting cron entry already exists — skipping install.")
        print("\nCurrent crontab:")
        print(existing)
        return

    # 4. Append to crontab (preserving existing entries)
    print("\n[7c] Adding morning-greeting cron entry (02:30 UTC = 08:00 IST)...")

    # Write new crontab: existing lines + new line
    # We use a heredoc-safe approach via temp file
    run_remote(
        client,
        f'(crontab -l 2>/dev/null; echo "{cron_line}") | crontab -',
        exit_on_fail=False
    )

    # 5. Verify it was added
    print("\n[7d] Verifying installed crontab...")
    result = run_remote(client, "crontab -l", exit_on_fail=False)
    if "morning-greeting" in result:
        print("\n[OK] morning-greeting cron installed successfully!")
    else:
        print("\n[WARN] Cron entry may not have been installed. Current crontab:")
    print(result)


# ──────────────────────────────────────────────
#  MAIN PIPELINE
# ──────────────────────────────────────────────
def main():
    print("\n" + "=" * 55)
    print("  InTrust India - VPS Deployment + Cron Update")
    print("  Target: https://intrustindia.com")
    print("=" * 55)

    # Step 1: Build locally
    build_local()

    # Step 2: Pack the build
    pack_build()

    # Connect once, reuse for upload + deploy + verify
    divider("Connecting to VPS...")
    try:
        import paramiko
    except ImportError:
        print("[ERROR] paramiko not installed. Run: pip install paramiko")
        sys.exit(1)

    client = ssh_connect()
    print(f"[OK] Connected to {VPS_HOST} as {VPS_USER}")

    try:
        # Step 3: Upload
        upload_tar(client)

        # Step 4: Deploy (NO npm build on server!)
        deploy_on_vps(client)

        # Step 5: Verify
        verify_health(client)

        # Step 6: Cleanup
        cleanup(client)

        # Step 7: Install cron
        install_morning_cron(client)

    finally:
        client.close()

    print("\n" + "=" * 55)
    print("  *** DEPLOYMENT + CRON UPDATE COMPLETE!")
    print("  URL: https://intrustindia.com")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    main()
