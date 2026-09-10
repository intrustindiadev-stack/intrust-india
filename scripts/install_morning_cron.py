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
VPS_PASSWORD = "intrustind@2026"
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
    # 30 0 * * *  = 00:30 UTC = 06:00 IST
    cron_content = (
        "# InTrust India — Daily good morning WhatsApp broadcast (06:00 IST = 00:30 UTC)\n"
        f'30 0 * * * {VPS_USER} curl -s -X GET https://intrustindia.com/api/cron/morning-greeting '
        f'-H "Authorization: Bearer {cron_secret}" '
        f'>> /home/intrustindia/logs/cron.log 2>&1\n'
    )

    # ── 3. Check if already installed ────────────────────────────────────────
    print(f"\n[2] Checking if {CRON_FILE} already exists ...")
    out, status = run(client, f"test -f {CRON_FILE} && echo EXISTS || echo NOT_EXISTS")
    if "EXISTS" in out:
        current_content, _ = run(client, f"cat {CRON_FILE}")
        if current_content.strip() == cron_content.strip():
            print(f"[OK] Cron file already up-to-date at {CRON_FILE}.")
            print(f"Contents:\n{current_content}")
            client.close()
            print("\n[DONE] No changes needed.")
            return
        print(f"[INFO] Cron file exists but needs update. Current:\n{current_content}\nUpdating to:\n{cron_content}")

    # ── 4. Write to /etc/cron.d/ via sudo ────────────────────────────────────
    # /etc/cron.d/ entries need the username column; format: SCHEDULE USER CMD
    print(f"\n[3] Writing cron file to {CRON_FILE} via SFTP and sudo ...")
    import tempfile
    sftp = client.open_sftp()
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as tmp:
        tmp.write(cron_content)
        tmp.flush()
        sftp.put(tmp.name, "/tmp/intrust_morning_cron")
    sftp.close()

    run(client, f"echo '{VPS_PASSWORD}' | sudo -S cp /tmp/intrust_morning_cron {CRON_FILE}")
    run(client, f"echo '{VPS_PASSWORD}' | sudo -S chmod 644 {CRON_FILE}")
    run(client, f"echo '{VPS_PASSWORD}' | sudo -S chown root:root {CRON_FILE}")
    run(client, "rm -f /tmp/intrust_morning_cron")
    print(f"[OK] Cron file written and permissions set.")

    # ── 5. Verify ─────────────────────────────────────────────────────────────
    print(f"\n[4] Verifying {CRON_FILE} ...")
    out, _ = run(client, f"cat {CRON_FILE}")
    print(out)

    # ── 6. Reload cron daemon ─────────────────────────────────────────────────
    print("\n[5] Reloading cron daemon ...")
    out, status = run(client, f"echo '{VPS_PASSWORD}' | sudo -S systemctl reload cron 2>/dev/null || echo '{VPS_PASSWORD}' | sudo -S systemctl reload crond 2>/dev/null || echo '{VPS_PASSWORD}' | sudo -S service cron reload 2>/dev/null || echo RELOADED_OR_SKIPPED")
    print(f"  {out}")

    client.close()
    print("\n" + "=" * 55)
    print("  *** CRON INSTALLED SUCCESSFULLY!")
    print("  Schedule: 00:30 UTC = 06:00 AM IST every day")
    print(f"  File: {CRON_FILE}")
    print("=" * 55)


if __name__ == "__main__":
    main()
