"""
InTrust India - VPS Deployment Script
======================================
Strategy: Build locally → Pack → Upload → Deploy on VPS
NEVER runs `npm run build` on the VPS to avoid server suspension.

Usage:
    python scripts/deploy_vps.py

Requirements:
    pip install paramiko
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

# Paths
PROJECT_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAR_NAME       = "build.tar.gz"
LOCAL_TAR      = os.path.join(PROJECT_DIR, TAR_NAME)
REMOTE_UPLOAD  = f"/var/www/intrustindia.com/{TAR_NAME}"
REMOTE_APP_DIR = "/var/www/intrustindia.com/app"

# What to include in the deployment package
INCLUDE_PATHS  = [".next", "public", "package.json", "package-lock.json", "next.config.mjs"]
EXCLUDE_DIRS   = [".next/cache", ".next/dev"]


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
        shell=True
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

    # Remove stale archive if present
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
        # Safely print for Windows terminals that might not support all Unicode characters (like emojis from PM2)
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
    run_remote(client, f"tar -xzf {REMOTE_UPLOAD} -C {REMOTE_APP_DIR}")

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
        print(f"\n[WARN]  Unexpected response. Check PM2 logs:")
        run_remote(client, "pm2 logs intrust-india --lines 30 --nostream", exit_on_fail=False, timeout=30)

    print("\nPublic domain check:")
    run_remote(client, "curl -s -o /dev/null -w 'https://intrustindia.com -> HTTP %{http_code}' https://intrustindia.com", exit_on_fail=False)


# ──────────────────────────────────────────────
#  MAIN PIPELINE
# ──────────────────────────────────────────────
def main():
    print("\n" + "=" * 55)
    print("  InTrust India - VPS Deployment")
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
    finally:
        client.close()

    print("\n" + "=" * 55)
    print("  *** DEPLOYMENT COMPLETE!")
    print("  URL: https://intrustindia.com")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    main()
