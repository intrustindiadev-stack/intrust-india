#!/usr/bin/env python3
"""
Phase 7 Step 2: Issue TLS cert + deploy full Nginx config + update app env
Run AFTER DNS A record is added on Cloudflare (grey-cloud / DNS Only) and propagated.
"""
import paramiko, time, sys, os

HOST = os.environ.get("VPS_HOST")
USER = os.environ.get("VPS_USER", "intrustindia")
PASS = os.environ.get("VPS_PASSWORD")
DOMAIN = "supabase.intrustindia.com"
CERTBOT_EMAIL = "admin@intrustindia.com"
ENV_PATH = "/var/www/intrustindia.com/app/.env.local"
SUPABASE_STACK_ENV = "/var/www/intrustindia.com/supabase-stack/.env"

if not HOST or not PASS:
    print("[ERROR] Missing required environment variables: VPS_HOST, VPS_PASSWORD", file=sys.stderr)
    sys.exit(1)

def ssh_sudo(c, cmd, label=""):
    if label:
        print(f"\n── {label}")
    full_cmd = f"echo {PASS} | sudo -S -p '' {cmd} 2>&1"
    print(f"$ sudo {cmd}")
    stdin, stdout, stderr = c.exec_command(full_cmd, timeout=180)
    out = stdout.read().decode().strip()
    rc = stdout.channel.recv_exit_status()
    if out:
        print(out)
    return out, rc

def ssh_run(c, cmd, label=""):
    if label:
        print(f"\n── {label}")
    print(f"$ {cmd}")
    stdin, stdout, stderr = c.exec_command(cmd, timeout=60)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    rc = stdout.channel.recv_exit_status()
    if out: print(out)
    if err: print(err)
    return out, err, rc

NGINX_FULL_CONF = r"""# HTTP -> HTTPS redirect + Let's Encrypt ACME challenge passthrough
server {
    listen 80;
    listen [::]:80;
    server_name supabase.intrustindia.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

# Main HTTPS — Kong proxy with WebSocket + CDN cache headers
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name supabase.intrustindia.com;

    # TLS managed by Certbot
    ssl_certificate /etc/letsencrypt/live/supabase.intrustindia.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/supabase.intrustindia.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Cloudflare real-IP restoration
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ── Realtime WebSocket (postgres_changes subscriptions) ──────
    # Critical: 20+ live subscriptions (wallet, orders, notifications, CRM...)
    location /realtime/v1/ {
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

    # ── Public storage — Cloudflare edge caches for 1 year ───────
    # (product-images, avatars, merchant_banners, banners, gift-cards are all public)
    location /storage/v1/object/public/ {
        proxy_pass http://127.0.0.1:8000/storage/v1/object/public/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffer_size 64k;
        proxy_buffers 8 64k;
        proxy_busy_buffers_size 128k;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header Vary "Accept-Encoding" always;
    }

    # ── Auth + REST — never cache ─────────────────────────────────
    location ~ ^/(auth|rest)/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        add_header Cache-Control "no-store" always;
    }

    # ── Other storage (authenticated uploads, kyc-documents) ─────
    location /storage/v1/ {
        proxy_pass http://127.0.0.1:8000/storage/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        add_header Cache-Control "no-store" always;
    }

    # ── Default — imgproxy + other Kong routes ────────────────────
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        add_header Cache-Control "no-store" always;
    }
}
"""


def main():
    print("=" * 60)
    print("Phase 7 Step 2: TLS + Full Nginx + Env Update")
    print("=" * 60)
    print("Prerequisites:")
    print("  1. DNS A record supabase.intrustindia.com → 187.124.98.130")
    print("     must be added on Cloudflare as 'DNS Only' (grey cloud).")
    print("  2. Confirm DNS is resolving before running this script.")
    print()

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASS)
    print("✓ Connected to VPS")

    # ── Check DNS resolution first ────────────────────────────────
    out, err, rc = ssh_run(c, f"host {DOMAIN} 2>/dev/null | head -3 || dig +short {DOMAIN} 2>/dev/null", "DNS check")
    if "187.124.98.130" not in out and rc != 0:
        print(f"\n⚠  DNS not resolving yet for {DOMAIN}")
        print("   Please add the A record on Cloudflare (grey cloud / DNS Only) and wait for propagation.")
        print("   Then re-run this script.")
        c.close()
        sys.exit(1)
    print(f"✓ DNS resolves: {out}")

    # ── Upload full Nginx config ──────────────────────────────────
    sftp = c.open_sftp()
    with sftp.open(f"/tmp/{DOMAIN}.full", "w") as f:
        f.write(NGINX_FULL_CONF)
    sftp.close()
    print("✓ Uploaded full Nginx config")

    # ── Run Certbot for TLS ───────────────────────────────────────
    out, rc = ssh_sudo(c,
        f"certbot certonly --nginx -d {DOMAIN} --non-interactive --agree-tos -m {CERTBOT_EMAIL}",
        "Certbot — issue TLS cert")
    if rc != 0:
        print(f"\n✗ Certbot failed (rc={rc})")
        print("  Common causes:")
        print("  - DNS not yet propagated (wait 2-5 min and retry)")
        print("  - Cloudflare proxy is ON (must be grey cloud for HTTP-01)")
        c.close()
        sys.exit(1)
    print("✓ TLS certificate issued!")

    # ── Deploy full Nginx config (with SSL blocks) ────────────────
    out, rc = ssh_sudo(c, f"cp /tmp/{DOMAIN}.full /etc/nginx/sites-available/{DOMAIN}", "Deploy full Nginx config")
    if rc != 0:
        print(f"✗ Failed to copy config (rc={rc})")
        c.close()
        sys.exit(1)

    out, rc = ssh_sudo(c, "nginx -t", "Test Nginx full config")
    if rc != 0:
        print("✗ Nginx config test failed!")
        c.close()
        sys.exit(1)
    print("✓ Nginx config OK")

    out, rc = ssh_sudo(c, "systemctl reload nginx", "Reload Nginx with TLS")
    print(f"✓ Nginx reloaded (rc={rc})")

    # ── Update .env.local ─────────────────────────────────────────
    # Read current ANON_KEY from supabase stack
    out_anon, err, rc = ssh_run(c, f"grep '^ANON_KEY=' {SUPABASE_STACK_ENV} | head -1")
    anon_key_line = out_anon.strip()
    anon_key = anon_key_line.split("=", 1)[1].strip() if "=" in anon_key_line else ""

    out_svc, err, rc = ssh_run(c, f"grep '^SERVICE_ROLE_KEY=' {SUPABASE_STACK_ENV} | head -1")
    svc_line = out_svc.strip()
    svc_key = svc_line.split("=", 1)[1].strip() if "=" in svc_line else ""

    print(f"\nAnon key found: {'YES' if anon_key else 'NO'}")
    print(f"Service role key found: {'YES' if svc_key else 'NO'}")

    # Update NEXT_PUBLIC_SUPABASE_URL
    out, rc = ssh_sudo(c,
        f"""sed -i 's|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=https://{DOMAIN}|g' {ENV_PATH}""",
        "Update NEXT_PUBLIC_SUPABASE_URL")

    # Update NEXT_PUBLIC_SUPABASE_ANON_KEY if we got it
    if anon_key:
        out, rc = ssh_sudo(c,
            f"""sed -i 's|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}|g' {ENV_PATH}""",
            "Update NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if svc_key:
        out, rc = ssh_sudo(c,
            f"""sed -i 's|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY={svc_key}|g' {ENV_PATH}""",
            "Update SUPABASE_SERVICE_ROLE_KEY")

    # Verify
    out, err, rc = ssh_run(c,
        f"grep -E 'NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY' {ENV_PATH}",
        "Verify .env.local")
    print(out)

    # ── Restart PM2 ───────────────────────────────────────────────
    out, err, rc = ssh_run(c, "pm2 restart intrust-india && pm2 save", "Restart PM2")
    if rc == 0:
        print("✓ PM2 restarted")
    else:
        print(f"⚠ PM2 restart returned rc={rc}")

    # ── Health checks ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("Health checks...")
    time.sleep(4)

    checks = [
        (f"curl -sf -o /dev/null -w '%{{http_code}}' https://{DOMAIN}/auth/v1/health", "Auth /health"),
        (f"curl -sf -o /dev/null -w '%{{http_code}}' https://{DOMAIN}/storage/v1/status", "Storage /status"),
        (f"curl -sf -o /dev/null -w '%{{http_code}}' https://{DOMAIN}/rest/v1/ -H 'apikey: {anon_key}'", "REST (anon key)"),
        (f"curl -sI https://{DOMAIN}/storage/v1/object/public/gift-cards/giftcard_1770373696147_x7xad.jpg 2>/dev/null | grep -i 'cache-control'", "Public image Cache-Control"),
        (f"curl -sI https://{DOMAIN}/auth/v1/health 2>/dev/null | grep -i 'cache-control'", "Auth Cache-Control"),
    ]

    all_ok = True
    for cmd, label in checks:
        out, err, rc = ssh_run(c, cmd, label)
        status = "✓" if rc == 0 and out.strip() else "⚠"
        print(f"  {status} {label}: {out.strip() or err.strip() or 'no output'}")
        if rc != 0:
            all_ok = False

    print("\n" + "=" * 60)
    if all_ok:
        print("✅ Phase 7 Step 2 COMPLETE!")
        print(f"   Backend live at: https://{DOMAIN}")
        print()
        print("NEXT: On Cloudflare dashboard:")
        print("  1. Switch supabase.intrustindia.com back to PROXIED (orange cloud)")
        print("  2. Set SSL/TLS mode to 'Full (Strict)'")
        print("  3. Create Cache Rule:")
        print(f"     URL: {DOMAIN}/storage/v1/object/public/*")
        print("     Cache Level: Cache Everything, Edge TTL: 1 year")
        print("  4. Enable Brotli under Speed → Optimization")
    else:
        print("⚠  Some checks failed — review output above.")

    c.close()


if __name__ == "__main__":
    main()
