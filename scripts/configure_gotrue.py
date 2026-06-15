#!/usr/bin/env python3
import os
import sys
import paramiko

# --- Configuration ---
VPS_HOST = os.environ.get("VPS_HOST")
VPS_USER = os.environ.get("VPS_USER", "intrustindia")
VPS_PASSWORD = os.environ.get("VPS_PASSWORD")
REMOTE_STACK_DIR = "/var/www/intrustindia.com/supabase-stack"
LOCAL_COMPOSE_PATH = "/home/i4yush/Desktop/intrust-india/scripts/supabase-stack/docker-compose.yml"
REMOTE_COMPOSE_PATH = "/var/www/intrustindia.com/supabase-stack/docker-compose.yml"
LOCAL_SECRETS_PATH = "/home/i4yush/Desktop/intrust-india/scripts/supabase-stack-secrets.txt"

if not VPS_HOST or not VPS_PASSWORD:
    print("[ERROR] Missing required environment variables: VPS_HOST, VPS_PASSWORD", file=sys.stderr)
    sys.exit(1)

# --- Styling helpers ---
CYAN = "\033[0;36m"; GREEN = "\033[0;32m"; YELLOW = "\033[1;33m"
RED  = "\033[0;31m"; BOLD  = "\033[1m";    RESET  = "\033[0m"

def info(msg): print(f"{CYAN}[INFO]{RESET} {msg}")
def ok(msg):   print(f"{GREEN}[OK]{RESET} {msg}")
def warn(msg): print(f"{YELLOW}[WARN]{RESET} {msg}")
def err(msg):  print(f"{RED}[ERROR]{RESET} {msg}", file=sys.stderr); sys.exit(1)

def ssh_connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    return c

def execute_cmd(client, cmd, stdin_data=None):
    stdin, stdout, stderr = client.exec_command(cmd)
    if stdin_data:
        stdin.write(stdin_data)
        stdin.channel.shutdown_write()
    out = stdout.read().decode("utf-8", errors="replace").strip()
    error_txt = stderr.read().decode("utf-8", errors="replace").strip()
    rc = stdout.channel.recv_exit_status()
    return rc, out, error_txt

def parse_env_content(content):
    env = {}
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' in line:
            k, v = line.split('=', 1)
            k = k.strip()
            v = v.strip()
            if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                v = v[1:-1]
            env[k] = v
    return env

def main():
    info("Starting GoTrue wiring and configuration process...")

    # Connect to VPS
    info(f"Connecting to VPS at {VPS_HOST}...")
    client = ssh_connect()
    ok("Connected successfully.")

    # 1. Extract credentials from app .env.local on the VPS
    info("Reading app .env.local on the VPS to extract credentials...")
    rc, app_env_content, error_txt = execute_cmd(client, "cat /var/www/intrustindia.com/app/.env.local")
    if rc != 0:
        # Fall back to .env if .env.local doesn't exist
        rc, app_env_content, error_txt = execute_cmd(client, "cat /var/www/intrustindia.com/app/.env")
        if rc != 0:
            err(f"Failed to read app environment file on VPS: {error_txt}")

    app_env = parse_env_content(app_env_content)

    smtp_host = app_env.get("SMTP_HOST", "")
    smtp_port = app_env.get("SMTP_PORT", "587")
    smtp_user = app_env.get("SMTP_USER", "")
    smtp_pass = app_env.get("SMTP_PASS", "")
    smtp_from = app_env.get("CONTACT_FROM_EMAIL", "noreply@intrustindia.com")
    google_id = app_env.get("GOOGLE_CLIENT_ID", "")
    google_secret = app_env.get("GOOGLE_CLIENT_SECRET", "")

    info(f"Extracted SMTP Host: {smtp_host or '(empty)'}")
    info(f"Extracted Google Client ID: {google_id[:15]}..." if google_id else "Extracted Google Client ID: (empty)")

    # 2. Read stack .env on the VPS
    info("Reading current stack .env on the VPS...")
    rc, stack_env_content, error_txt = execute_cmd(client, f"cat {REMOTE_STACK_DIR}/.env")
    if rc != 0:
        err(f"Failed to read stack .env: {error_txt}")

    stack_env_lines = stack_env_content.splitlines()
    new_env_lines = []

    # Prepare GoTrue variables to insert/update
    updates = {
        "SITE_URL": "https://intrustindia.com",
        "ADDITIONAL_REDIRECT_URLS": "https://intrustindia.com/auth/callback,https://intrustindia.com/api/auth/google/callback,https://intrustindia.com/**,http://localhost:3000/**",
        "ENABLE_EMAIL_SIGNUP": "true",
        "ENABLE_EMAIL_AUTOCONFIRM": "false",
        "ENABLE_PHONE_SIGNUP": "true",
        "ENABLE_PHONE_AUTOCONFIRM": "true",
        "SMTP_HOST": smtp_host,
        "SMTP_PORT": smtp_port,
        "SMTP_USER": smtp_user,
        "SMTP_PASS": smtp_pass,
        "SMTP_ADMIN_EMAIL": smtp_from,
        "ENABLE_GOOGLE_OAUTH": "true",
        "GOOGLE_CLIENT_ID": google_id,
        "GOOGLE_CLIENT_SECRET": google_secret
    }

    # Track updated keys
    updated_keys = set()

    for line in stack_env_lines:
        line_strip = line.strip()
        if not line_strip or line_strip.startswith('#'):
            new_env_lines.append(line)
            continue
        if '=' in line_strip:
            k, v = line_strip.split('=', 1)
            k = k.strip()
            if k in updates:
                new_env_lines.append(f"{k}={updates[k]}")
                updated_keys.add(k)
            else:
                new_env_lines.append(line)
        else:
            new_env_lines.append(line)

    # Append any keys that weren't in the original env file
    for k, v in updates.items():
        if k not in updated_keys:
            new_env_lines.append(f"{k}={v}")

    # Write the updated .env back to the VPS
    info("Updating stack .env on the VPS...")
    updated_env_content = "\n".join(new_env_lines) + "\n"
    rc, out, error_txt = execute_cmd(
        client,
        f"cat > {REMOTE_STACK_DIR}/.env",
        stdin_data=updated_env_content
    )
    if rc != 0:
        err(f"Failed to update stack .env: {error_txt}")
    ok("Stack .env updated.")

    # 3. Upload the updated docker-compose.yml to the VPS
    info("Uploading modified docker-compose.yml to the VPS...")
    sftp = client.open_sftp()
    sftp.put(LOCAL_COMPOSE_PATH, REMOTE_COMPOSE_PATH)
    sftp.close()
    ok("docker-compose.yml uploaded.")

    # 4. Restart GoTrue container
    info("Re-creating GoTrue auth container to apply configuration...")
    restart_cmd = f"docker compose -f {REMOTE_COMPOSE_PATH} up -d --force-recreate auth"
    rc, out, error_txt = execute_cmd(client, restart_cmd)
    if rc != 0:
        err(f"Failed to recreate GoTrue auth container: {error_txt}")
    ok("GoTrue auth container recreated successfully.")

    # 5. Extract service role key and anon key
    info("Extracting keys for auth integration testing...")
    service_role_key = None
    anon_key = None
    with open(LOCAL_SECRETS_PATH, 'r') as f:
        for line in f:
            if line.startswith("SERVICE_ROLE_KEY="):
                service_role_key = line.split("=")[1].strip()
            elif line.startswith("ANON_KEY="):
                anon_key = line.split("=")[1].strip()

    if not service_role_key or not anon_key:
        err("Could not extract SERVICE_ROLE_KEY or ANON_KEY from local secrets!")

    # 6. Write and run programmatic Javascript tests on the VPS
    info("Writing and running programmatic auth flow verification script on the VPS...")
    test_js = f"""
const {{ createClient }} = require('@supabase/supabase-js');

const serviceRoleKey = "{service_role_key}";
const anonKey = "{anon_key}";

const supabase = createClient('http://localhost:8000', serviceRoleKey, {{
  auth: {{ autoRefreshToken: false, persistSession: false }}
}});

const clientSupabase = createClient('http://localhost:8000', anonKey, {{
  auth: {{ autoRefreshToken: false, persistSession: false }}
}});

async function runTests() {{
  const email = `test_${{Math.random().toString(36).substring(7)}}@intrust-test.com`;
  const password = 'TestSecurePassword123!';

  console.log('--- TESTING ADMIN API SURFACE ---');

  // 1. Create User
  const {{ data: createData, error: createError }} = await supabase.auth.admin.createUser({{
    email,
    password,
    email_confirm: true
  }});
  if (createError) throw createError;
  const userId = createData.user.id;
  console.log('✅ createUser success:', userId);

  // 2. Get User By Id
  const {{ data: getData, error: getError }} = await supabase.auth.admin.getUserById(userId);
  if (getError) throw getError;
  console.log('✅ getUserById success:', getData.user.email);

  // 3. Update User By Id
  const {{ data: updateData, error: updateError }} = await supabase.auth.admin.updateUserById(userId, {{
    user_metadata: {{ tested: true }}
  }});
  if (updateError) throw updateError;
  console.log('✅ updateUserById success:', updateData.user.user_metadata.tested);

  // 4. List Users
  const {{ data: listData, error: listError }} = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  console.log('✅ listUsers success, count:', listData.users.length);

  // 5. Generate Link
  const {{ data: linkData, error: linkError }} = await supabase.auth.admin.generateLink({{
    type: 'magiclink',
    email
  }});
  if (linkError) throw linkError;
  console.log('✅ generateLink success:', !!linkData.properties.hashed_token);

  // 6. Create Session
  if (typeof supabase.auth.admin.createSession === 'function') {{
    const {{ data: sessionData, error: sessionError }} = await supabase.auth.admin.createSession(userId);
    if (sessionError) throw sessionError;
    console.log('✅ createSession success, token:', !!sessionData.session.access_token);
  }} else {{
    console.log('⚠️ createSession is not available on this client library');
  }}

  console.log('--- TESTING END-TO-END SIGNIN FLOWS ---');

  // 7. Email Sign-In (Using client clientSupabase)
  const {{ data: signInData, error: signInError }} = await clientSupabase.auth.signInWithPassword({{
    email,
    password
  }});
  if (signInError) throw signInError;
  console.log('✅ Email signin success, user:', signInData.user.id);

  // 8. Sign Out (others)
  const {{ error: signOutError }} = await supabase.auth.admin.signOut(signInData.session.access_token, 'others');
  if (signOutError) throw signOutError;
  console.log('✅ signOut (others) success');

  // 9. Phone-OTP Flow Mock (Verify creating pseudo-email user and magiclink token exchange)
  console.log('Testing Phone-OTP Flow Mock...');
  const phone = "9199999999";
  const pseudoEmail = `phone_${{phone}}@intrust-phone.com`;
  
  // Create / locate pseudo email user (verify-otp route behavior)
  const {{ data: otpUser, error: otpUserErr }} = await supabase.auth.admin.createUser({{
    email: pseudoEmail,
    email_confirm: true
  }});
  
  let targetUserId;
  if (otpUserErr) {{
    if (otpUserErr.message.includes('already registered') || otpUserErr.message.includes('already been registered')) {{
      // Locate user
      const {{ data: existingUsers, error: listErr }} = await supabase.auth.admin.listUsers();
      const existing = existingUsers.users.find(u => u.email === pseudoEmail);
      if (!existing) throw new Error('Collision but user not found.');
      targetUserId = existing.id;
    }} else {{
      throw otpUserErr;
    }}
  }} else {{
    targetUserId = otpUser.user.id;
  }}
  
  // Generate magic link token (verify-otp route behavior)
  const {{ data: generatedLink, error: genLinkErr }} = await supabase.auth.admin.generateLink({{
    type: 'magiclink',
    email: pseudoEmail,
    options: {{ shouldCreateUser: false }}
  }});
  if (genLinkErr) throw genLinkErr;
  
  // Token exchange
  const {{ data: exchanged, error: exchangeErr }} = await clientSupabase.auth.verifyOtp({{
    token_hash: generatedLink.properties.hashed_token,
    type: 'magiclink'
  }});
  if (exchangeErr) throw exchangeErr;
  console.log('✅ Phone-OTP verification flow mock success, session user:', exchanged.user.id);

  // 10. Clean up test users
  await supabase.auth.admin.deleteUser(userId);
  await supabase.auth.admin.deleteUser(targetUserId);
  console.log('✅ Cleaned up test users successfully.');
}}

runTests().catch(err => {{
  console.error('❌ Test failed:', err);
  process.exit(1);
}});
"""

    rc, out, error_txt = execute_cmd(
        client,
        "cat > /var/www/intrustindia.com/app/scripts/gotrue_test.js",
        stdin_data=test_js
    )
    if rc != 0:
        err(f"Failed to write verification script: {error_txt}")

    # Run the verification script
    info("Running verification tests on VPS...")
    test_run_cmd = (
        'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
        'cd /var/www/intrustindia.com/app && '
        'node scripts/gotrue_test.js'
    )
    rc, out, error_txt = execute_cmd(client, test_run_cmd)

    # Clean up the script
    execute_cmd(client, "rm -f /var/www/intrustindia.com/app/scripts/gotrue_test.js")

    if rc != 0:
        err(f"Auth flow tests failed: {out}\n{error_txt}")

    print("\n" + "="*50 + "\nAuth Integration Verification Results:\n" + "="*50)
    print(out)
    print("="*50 + "\n")

    ok("All GoTrue auth flow tests passed successfully against the new stack!")
    info("Authorized Redirect URI for Google Cloud Console OAuth Client ID:")
    print(f"👉 {BOLD}https://intrustindia.com/api/auth/google/callback{RESET}\n")

    client.close()

if __name__ == "__main__":
    main()
