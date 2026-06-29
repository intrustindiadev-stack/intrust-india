"""
InTrust India - Install morning-greeting cron on VPS
=====================================================
Tries multiple approaches because /var/spool/cron/ may be permission-restricted.
Approach 1: sudo tee /etc/cron.d/intrust-morning-greeting
Approach 2: sudo crontab -u intrustindia -l/-e
"""

import sys

VPS_HOST     = "187.124.98.130"
VPS_USER     = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT     = 22
REMOTE_APP_DIR = "/var/www/intrustindia.com/app"

CRON_FILE    = "/etc/cron.d/intrust-morning-greeting"
CRON_MARKER  = "intrust-morning-greeting"

def ssh_connect():
    import paramiko
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD,
              timeout=30, allow_agent=False, look_for_keys=False)
    return c


def run(client, cmd, timeout=30, sudo_pass=None):
    """Run a command, optionally feeding a sudo password via stdin."""
    full_cmd = f'bash -c \'{cmd}\''
    stdin, sout, serr = client.exec_command(full_cmd, timeout=timeout, get_pty=True)
    if sudo_pass:
        # Feed password if sudo prompts
        import time; time.sleep(0.5)
        stdin.write(sudo_pass + "\n")
        stdin.flush()
    out = sout.read().decode("utf-8", errors="replace").strip()
    status = sout.channel.recv_exit_status()
    return out, status


def main():
    try:
        import paramiko
    except ImportError:
        print("[ERROR] paramiko not installed. Run: pip install paramiko")
        sys.exit(1)

    print("Connecting to VPS...")
    client = ssh_connect()
    print(f"[OK] Connected to {VPS_HOST}")

    # ── 1. Read CRON_SECRET from VPS env ─────────────────────────────────────
    print("\n[1] Reading CRON_SECRET from VPS .env.local ...")
    out, _ = run(client,
        f"grep '^CRON_SECRET=' {REMOTE_APP_DIR}/.env.local 2>/dev/null || "
        f"grep '^CRON_SECRET=' {REMOTE_APP_DIR}/.env 2>/dev/null || echo NOT_FOUND"
    )
    if "NOT_FOUND" in out or not out.strip():
        print("[ERROR] CRON_SECRET not found in .env.local — aborting.")
        client.close()
        sys.exit(1)

    cron_secret = out.strip().split("=", 1)[-1].strip().strip('"').strip("'")
    print(f"[OK] CRON_SECRET found (length={len(cron_secret)})")

    # ── 2. Build the cron content ─────────────────────────────────────────────
    # 30 2 * * *  = 02:30 UTC = 08:00 IST
    cron_content = (
        "# InTrust India — Daily good morning WhatsApp broadcast (08:00 IST = 02:30 UTC)\n"
        f'30 2 * * * {VPS_USER} curl -s -X GET https://intrustindia.com/api/cron/morning-greeting '
        f'-H "Authorization: Bearer {cron_secret}" '
        f'>> /var/log/intrust-cron.log 2>&1\n'
    )

    # ── 3. Check if already installed ────────────────────────────────────────
    print(f"\n[2] Checking if {CRON_FILE} already exists ...")
    out, status = run(client, f"test -f {CRON_FILE} && echo EXISTS || echo NOT_EXISTS")
    if "EXISTS" in out:
        print(f"[OK] Cron file already exists at {CRON_FILE}.")
        out, _ = run(client, f"cat {CRON_FILE}")
        print(f"Contents:\n{out}")
        client.close()
        print("\n[DONE] No changes needed.")
        return

    # ── 4. Write to /etc/cron.d/ via sudo ────────────────────────────────────
    # /etc/cron.d/ entries need the username column; format: SCHEDULE USER CMD
    print(f"\n[3] Writing cron file to {CRON_FILE} via sudo ...")

    # Escape single quotes in cron_content for bash
    escaped = cron_content.replace("'", "'\\''")
    write_cmd = f"echo '{escaped}' | sudo -S tee {CRON_FILE} > /dev/null"
    out, status = run(client, write_cmd, sudo_pass=VPS_PASSWORD)
    print(f"  stdout: {out!r}  exit={status}")

    if status == 0:
        # Fix permissions — /etc/cron.d files must be owned root:root, mode 644
        run(client, f"sudo -S chmod 644 {CRON_FILE}", sudo_pass=VPS_PASSWORD)
        run(client, f"sudo -S chown root:root {CRON_FILE}", sudo_pass=VPS_PASSWORD)
        print(f"[OK] Cron file written and permissions set.")
    else:
        # Fallback: try writing as user crontab via crontab command with env var method
        print("[WARN] sudo tee failed. Trying alternative: writing temp file + sudo mv ...")
        tmp = "/tmp/intrust_cron_tmp"
        run(client, f"echo '{escaped}' > {tmp}")
        out2, status2 = run(client, f"sudo -S mv {tmp} {CRON_FILE} && sudo -S chmod 644 {CRON_FILE} && sudo -S chown root:root {CRON_FILE}", sudo_pass=VPS_PASSWORD)
        print(f"  alt stdout: {out2!r}  exit={status2}")
        if status2 != 0:
            print("\n[ERROR] Both sudo approaches failed.")
            print("Please run this manually on the VPS:")
            print(f"\n  sudo bash -c 'cat > {CRON_FILE} << EOF")
            print(cron_content)
            print("  EOF'")
            print(f"  sudo chmod 644 {CRON_FILE}")
            client.close()
            sys.exit(1)

    # ── 5. Verify ─────────────────────────────────────────────────────────────
    print(f"\n[4] Verifying {CRON_FILE} ...")
    out, _ = run(client, f"cat {CRON_FILE}")
    print(out)

    # ── 6. Reload cron daemon ─────────────────────────────────────────────────
    print("\n[5] Reloading cron daemon ...")
    # Try systemctl, then service, then crond
    out, status = run(client, "sudo -S systemctl reload cron 2>/dev/null || sudo -S systemctl reload crond 2>/dev/null || sudo -S service cron reload 2>/dev/null || echo RELOADED_OR_SKIPPED", sudo_pass=VPS_PASSWORD)
    print(f"  {out}")

    client.close()
    print("\n" + "=" * 55)
    print("  *** CRON INSTALLED SUCCESSFULLY!")
    print("  Schedule: 02:30 UTC = 08:00 AM IST every day")
    print(f"  File: {CRON_FILE}")
    print("=" * 55)


if __name__ == "__main__":
    main()
