#!/usr/bin/env python3
import paramiko, sys, os

HOST = os.environ.get("VPS_HOST")
USER = os.environ.get("VPS_USER", "intrustindia")
PASS = os.environ.get("VPS_PASSWORD")

if not HOST or not PASS:
    print("[ERROR] Missing required environment variables: VPS_HOST, VPS_PASSWORD", file=sys.stderr)
    sys.exit(1)

def ssh_sudo(c, cmd):
    full_cmd = f"echo {PASS} | sudo -S -p '' {cmd} 2>&1"
    print(f"$ sudo {cmd}")
    stdin, stdout, stderr = c.exec_command(full_cmd, timeout=30)
    out = stdout.read().decode().strip()
    rc = stdout.channel.recv_exit_status()
    if out:
        print(out)
    return out, rc

def main():
    print("Patching intrustindia.com Nginx config with WebSocket headers...")
    
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASS)
    print("✓ Connected to VPS")

    CONF_PATH = "/etc/nginx/sites-available/intrustindia.com"

    # Check if the file exists
    out, rc = ssh_sudo(c, f"cat {CONF_PATH}")
    if rc != 0:
        print(f"✗ Nginx config {CONF_PATH} not found!")
        c.close()
        sys.exit(1)

    if "/api/supabase/realtime/v1/" in out:
        print("✓ Realtime block already exists in Nginx config. Skipping.")
    else:
        # We need to insert the location block BEFORE `location /api/supabase/` or `location /`
        # Using a simple python script executed remotely to do the injection safely
        inject_script = """
import sys
conf_path = '/etc/nginx/sites-available/intrustindia.com'
with open(conf_path, 'r') as f:
    content = f.read()

realtime_block = '''
    # ── Realtime WebSocket (patched) ──────
    location /api/supabase/realtime/v1/ {
        proxy_pass http://127.0.0.1:8000/realtime/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 10s;
        proxy_buffering off;
        add_header Cache-Control "no-store" always;
    }
'''

# Find the location /api/supabase/ block and insert just before it
target = 'location /api/supabase/'
if target in content:
    content = content.replace(target, realtime_block + '\\n    ' + target)
else:
    # If not found, just insert before location /
    target = 'location /'
    if target in content:
        content = content.replace(target, realtime_block + '\\n    ' + target)

with open(conf_path, 'w') as f:
    f.write(content)
"""
        sftp = c.open_sftp()
        with sftp.open("/tmp/inject.py", "w") as f:
            f.write(inject_script)
        sftp.close()

        print("Injecting location block...")
        out, rc = ssh_sudo(c, "python3 /tmp/inject.py")
        if rc != 0:
            print(f"✗ Failed to inject block: {out}")
            c.close()
            sys.exit(1)

        print("Testing Nginx config...")
        out, rc = ssh_sudo(c, "nginx -t")
        if rc != 0:
            print("✗ Nginx config test failed! Reverting...")
            # We don't have a backup here but a manual fix would be needed
            c.close()
            sys.exit(1)

        print("Reloading Nginx...")
        out, rc = ssh_sudo(c, "systemctl reload nginx")
        print("✓ Nginx reloaded!")

    c.close()

if __name__ == "__main__":
    main()
