#!/usr/bin/env bash
# =============================================================================
# deploy_supabase_stack.sh
# =============================================================================
# Deploys the trimmed Supabase Docker stack to the InTrust India VPS.
#
# Usage:
#   chmod +x scripts/deploy_supabase_stack.sh
#   ./scripts/deploy_supabase_stack.sh [--host HOST] [--user USER] [--key KEY_FILE]
#
# Defaults:
#   --host  187.124.98.130
#   --user  root
#   --key   (uses ssh-agent / default key)
#
# What this script does:
#   1. Generates fresh secrets locally (JWT_SECRET, POSTGRES_PASSWORD, JWTs, etc.)
#   2. Writes a populated .env file
#   3. SCPs the entire supabase-stack/ directory to the VPS
#   4. SSH-executes the VPS bootstrap (Docker install, swap, clone, bring-up)
#   5. Polls health and prints a summary
#
# Requirements (local machine):
#   - openssl, python3, ssh, scp
# =============================================================================
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
if [[ -z "${VPS_HOST:-}" ]]; then
  error "VPS_HOST environment variable must be set"
fi
VPS_USER="${VPS_USER:-intrustindia}"
VPS_KEY="${VPS_KEY:-}"          # Path to SSH private key, e.g. ~/.ssh/id_rsa
REMOTE_DIR="/var/www/intrustindia.com/supabase-stack"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="${SCRIPT_DIR}/supabase-stack"

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}═══ $* ═══${RESET}"; }

# ─── Parse CLI args ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) VPS_HOST="$2"; shift 2;;
    --user) VPS_USER="$2"; shift 2;;
    --key)  VPS_KEY="$2";  shift 2;;
    *) error "Unknown argument: $1";;
  esac
done

SSH_OPTS=(-o StrictHostKeyChecking=no -o ConnectTimeout=15 -o BatchMode=no)
if [[ -n "$VPS_KEY" ]]; then
  SSH_OPTS+=(-i "$VPS_KEY")
fi

ssh_exec() { ssh "${SSH_OPTS[@]}" "${VPS_USER}@${VPS_HOST}" "$@"; }
scp_up()   { scp -r "${SSH_OPTS[@]}" "$1" "${VPS_USER}@${VPS_HOST}:$2"; }

# ─── Dependency checks ────────────────────────────────────────────────────────
for cmd in openssl python3 ssh scp; do
  command -v "$cmd" &>/dev/null || error "Required command not found: $cmd"
done

header "PHASE 1 — Generate Secrets"

# Generate a cryptographically random secret
gen_secret() { openssl rand -hex "${1:-32}"; }

POSTGRES_PASSWORD=$(gen_secret 24)
JWT_SECRET=$(gen_secret 40)
DASHBOARD_PASSWORD=$(gen_secret 16)
SECRET_KEY_BASE=$(gen_secret 64)
PG_META_CRYPTO_KEY=$(openssl rand -base64 24 | tr -d '=/+' | head -c 32)
VAULT_ENC_KEY=$(openssl rand -base64 24 | tr -d '=/+' | head -c 32)
S3_KEY_ID=$(openssl rand -hex 16)
S3_KEY_SECRET=$(openssl rand -hex 32)

info "Generating ANON_KEY and SERVICE_ROLE_KEY (HS256 JWTs)..."

# Generate HS256 JWT using Python (no external deps needed)
generate_jwt() {
  local role="$1"
  local secret="$2"
  python3 - "$role" "$secret" <<'PYEOF'
import sys, base64, hmac, hashlib, json, time

role = sys.argv[1]
secret = sys.argv[2].encode()

# JWT header
header = base64.urlsafe_b64encode(
    json.dumps({"alg": "HS256", "typ": "JWT"}).encode()
).rstrip(b'=').decode()

# JWT payload — long expiry for self-hosted (10 years)
now = int(time.time())
payload_data = {
    "role": role,
    "iss": "supabase",
    "iat": now,
    "exp": now + (10 * 365 * 24 * 3600)
}
payload = base64.urlsafe_b64encode(
    json.dumps(payload_data).encode()
).rstrip(b'=').decode()

# Signature
msg = f"{header}.{payload}".encode()
sig = base64.urlsafe_b64encode(
    hmac.new(secret, msg, hashlib.sha256).digest()
).rstrip(b'=').decode()

print(f"{header}.{payload}.{sig}")
PYEOF
}

ANON_KEY=$(generate_jwt "anon" "$JWT_SECRET")
SERVICE_ROLE_KEY=$(generate_jwt "service_role" "$JWT_SECRET")

success "Secrets generated."
info "  JWT_SECRET (first 8 chars): ${JWT_SECRET:0:8}..."
info "  ANON_KEY   (first 30 chars): ${ANON_KEY:0:30}..."
info "  SERVICE_ROLE_KEY (first 30): ${SERVICE_ROLE_KEY:0:30}..."

header "PHASE 2 — Build .env File"

ENV_FILE="${STACK_DIR}/.env"

sed \
  -e "s|REPLACE_POSTGRES_PASSWORD|${POSTGRES_PASSWORD}|g" \
  -e "s|REPLACE_JWT_SECRET|${JWT_SECRET}|g" \
  -e "s|REPLACE_ANON_KEY|${ANON_KEY}|g" \
  -e "s|REPLACE_SERVICE_ROLE_KEY|${SERVICE_ROLE_KEY}|g" \
  -e "s|REPLACE_DASHBOARD_PASSWORD|${DASHBOARD_PASSWORD}|g" \
  -e "s|REPLACE_SECRET_KEY_BASE|${SECRET_KEY_BASE}|g" \
  -e "s|REPLACE_PG_META_CRYPTO_KEY|${PG_META_CRYPTO_KEY}|g" \
  -e "s|REPLACE_VAULT_ENC_KEY|${VAULT_ENC_KEY}|g" \
  -e "s|REPLACE_S3_KEY_ID|${S3_KEY_ID}|g" \
  -e "s|REPLACE_S3_KEY_SECRET|${S3_KEY_SECRET}|g" \
  "${STACK_DIR}/.env.template" > "${ENV_FILE}"

success ".env written to ${ENV_FILE}"

# Save a local backup with the secrets (DO NOT commit this file)
SECRETS_FILE="${SCRIPT_DIR}/supabase-stack-secrets.txt"
cat > "${SECRETS_FILE}" <<EOF
# Supabase Stack Secrets — $(date -u '+%Y-%m-%dT%H:%M:%SZ')
# DO NOT COMMIT THIS FILE
VPS_HOST=${VPS_HOST}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
SECRET_KEY_BASE=${SECRET_KEY_BASE}
PG_META_CRYPTO_KEY=${PG_META_CRYPTO_KEY}
VAULT_ENC_KEY=${VAULT_ENC_KEY}
S3_KEY_ID=${S3_KEY_ID}
S3_KEY_SECRET=${S3_KEY_SECRET}
EOF
chmod 600 "${SECRETS_FILE}"
success "Secrets backed up locally to ${SECRETS_FILE} (chmod 600)"

header "PHASE 3 — VPS Bootstrap (Docker + Swap)"

info "Connecting to ${VPS_USER}@${VPS_HOST}..."

ssh_exec bash -s <<'BOOTSTRAP'
set -euo pipefail

echo "==> Checking OS..."
. /etc/os-release
echo "    OS: $PRETTY_NAME"

# ── Install Docker ──────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "==> Installing Docker..."
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg lsb-release git

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  echo "==> Docker installed: $(docker --version)"
else
  echo "==> Docker already installed: $(docker --version)"
fi

# ── Swap file ───────────────────────────────────────────────────────────────
CURRENT_SWAP=$(free -m | awk '/^Swap:/{print $2}')
if [ "${CURRENT_SWAP}" -lt 3800 ]; then
  echo "==> Setting up 4 GB swap (current: ${CURRENT_SWAP} MB)..."
  if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile 2>/dev/null || true

  # Persist across reboots
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

  # Tune swappiness — prefer RAM, use swap only under memory pressure
  cat > /etc/sysctl.d/99-supabase-swap.conf <<EOF
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF
  sysctl -p /etc/sysctl.d/99-supabase-swap.conf
  echo "==> Swap active: $(free -h | awk '/^Swap:/{print $2}')"
else
  echo "==> Swap already sufficient: ${CURRENT_SWAP} MB"
fi

# ── Create stack directory ───────────────────────────────────────────────────
mkdir -p /var/www/intrustindia.com/supabase-stack
echo "==> Target directory ready: /var/www/intrustindia.com/supabase-stack"
BOOTSTRAP

success "VPS bootstrap complete."

header "PHASE 4 — Clone upstream Supabase volumes + config files"

# We need the official volume SQL files, kong config, etc. from supabase/docker
# Clone the upstream repo on the VPS (shallow) to get those files
ssh_exec bash -s <<'CLONE_UPSTREAM'
set -euo pipefail
REMOTE_DIR="/var/www/intrustindia.com/supabase-stack"

if [ ! -d "${REMOTE_DIR}/.git-upstream-done" ]; then
  echo "==> Cloning supabase/supabase (shallow, to get docker/ config files)..."
  TMP_DIR=$(mktemp -d)
  git clone --depth=1 --filter=blob:none --sparse \
    https://github.com/supabase/supabase.git "${TMP_DIR}/supabase-src"

  cd "${TMP_DIR}/supabase-src"
  git sparse-checkout set docker

  # Copy volumes directory (contains SQL migrations, kong config, etc.)
  echo "==> Copying upstream volumes and config files..."
  cp -r "${TMP_DIR}/supabase-src/docker/volumes" "${REMOTE_DIR}/"
  cp -r "${TMP_DIR}/supabase-src/docker/dev" "${REMOTE_DIR}/" 2>/dev/null || true

  rm -rf "${TMP_DIR}"
  mkdir -p "${REMOTE_DIR}/.git-upstream-done"
  echo "==> Upstream files copied."
else
  echo "==> Upstream files already present, skipping clone."
fi

# Ensure our init directory exists
mkdir -p "${REMOTE_DIR}/volumes/db/init"
mkdir -p "${REMOTE_DIR}/volumes/snippets"
mkdir -p "${REMOTE_DIR}/volumes/functions"
echo "==> Volume directories ready."
CLONE_UPSTREAM

success "Upstream Supabase volumes cloned on VPS."

header "PHASE 5 — Upload Stack Configuration"

info "Uploading docker-compose.yml, .env, and extension SQL..."

# Upload our custom docker-compose.yml
scp_up "${STACK_DIR}/docker-compose.yml" "${REMOTE_DIR}/docker-compose.yml"

# Upload the populated .env
scp_up "${ENV_FILE}" "${REMOTE_DIR}/.env"

# Upload our extension init SQL
scp_up "${STACK_DIR}/volumes/db/init/99-extensions.sql" \
  "${REMOTE_DIR}/volumes/db/init/99-extensions.sql"

# Upload fix-init SQL
scp_up "${STACK_DIR}/volumes/db/init/98-fix-init.sql" \
  "${REMOTE_DIR}/volumes/db/init/98-fix-init.sql"

success "Files uploaded."

header "PHASE 6 — Bring Up the Stack"

info "Running: docker compose up -d on the VPS..."

ssh_exec bash -s <<COMPOSE_UP
set -euo pipefail
cd "${REMOTE_DIR}"

echo "==> Running preflight check for mounted files..."
MISSING=0
FILES=\$(grep -E '^\s*-\s*\./volumes/.*\:[^:]*$' docker-compose.yml | awk -F':' '{print \$1}' | sed 's/^[ \t]*- \.\///')
for f in \$FILES; do
    if [ ! -f "\$f" ]; then
        echo "[ERROR] Missing bound file: \$f"
        MISSING=1
    fi
done
if [ \$MISSING -eq 1 ]; then exit 1; fi
echo "[OK] All bound files exist."

echo "==> Pulling images (may take a few minutes on first run)..."
docker compose pull --quiet

echo "==> Starting services..."
docker compose up -d

echo "==> Container status:"
docker compose ps
COMPOSE_UP

success "Stack started."

header "PHASE 7 — Health Check"

info "Waiting for services to become healthy (up to 120s)..."

ssh_exec bash -s <<'HEALTHCHECK'
set -euo pipefail
cd "/var/www/intrustindia.com/supabase-stack"

wait_healthy() {
  local container="$1"
  local max_wait="${2:-90}"
  local waited=0
  echo -n "  Waiting for ${container}..."
  while [ $waited -lt $max_wait ]; do
    status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "missing")
    if [ "$status" = "healthy" ]; then
      echo " ✓ healthy"
      return 0
    elif [ "$status" = "unhealthy" ]; then
      echo " ✗ UNHEALTHY"
      docker logs --tail=20 "$container"
      return 1
    fi
    echo -n "."
    sleep 3
    waited=$((waited + 3))
  done
  # No healthcheck defined = just check it's running
  running=$(docker inspect --format='{{.State.Running}}' "$container" 2>/dev/null || echo "false")
  if [ "$running" = "true" ]; then
    echo " ~ running (no healthcheck)"
    return 0
  fi
  echo " ✗ TIMEOUT after ${max_wait}s"
  return 1
}

wait_healthy supabase-db 120
wait_healthy supabase-auth 60
wait_healthy supabase-kong 60
wait_healthy supabase-storage 60
wait_healthy supabase-imgproxy 30

# Load ANON_KEY from .env
ANON_KEY=$(grep '^ANON_KEY=' /var/www/intrustindia.com/supabase-stack/.env | cut -d= -f2-)

echo ""
echo "==> Testing Kong REST endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://127.0.0.1:8000/rest/v1/" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}")
echo "  Kong /rest/v1/ → HTTP ${HTTP_CODE}"
[ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || {
  echo "  WARNING: Unexpected HTTP code ${HTTP_CODE} from Kong. Check logs."
}

echo ""
echo "==> Testing Auth health..."
AUTH_STATUS=$(curl -s "http://127.0.0.1:8000/auth/v1/health" \
  -H "apikey: ${ANON_KEY}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "error")
echo "  Auth health → ${AUTH_STATUS}"

echo ""
echo "==> Checking extensions in Postgres..."
docker exec supabase-db psql -U postgres -c "
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pgcrypto','uuid-ossp','pg_cron','pg_stat_statements','supabase_vault','pg_net')
ORDER BY extname;
"

echo ""
echo "==> Memory usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" 2>/dev/null || true
HEALTHCHECK

success "Health checks complete."

header "PHASE 8 — Summary"

# Load keys back from the secrets file for display
ANON_KEY_SHORT="${ANON_KEY:0:40}..."
SERVICE_ROLE_KEY_SHORT="${SERVICE_ROLE_KEY:0:40}..."

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║  Supabase Stack — Deployment Summary                        ║${RESET}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════════════╣${RESET}"
echo -e "  ${CYAN}VPS:${RESET}             ${VPS_HOST}"
echo -e "  ${CYAN}Stack dir:${RESET}       ${REMOTE_DIR}"
echo -e "  ${CYAN}Kong (internal):${RESET} http://127.0.0.1:8000"
echo -e "  ${CYAN}Public URL:${RESET}      https://intrustindia.com (after Nginx setup)"
echo ""
echo -e "  ${CYAN}ANON_KEY:${RESET}        ${ANON_KEY_SHORT}"
echo -e "  ${CYAN}SERVICE_ROLE_KEY:${RESET} ${SERVICE_ROLE_KEY_SHORT}"
echo -e "  ${CYAN}Dashboard user:${RESET}  supabase / [see secrets file]"
echo ""
echo -e "  ${GREEN}Secrets saved to:${RESET} ${SECRETS_FILE}"
echo ""
echo -e "  ${YELLOW}Next steps:${RESET}"
echo -e "   1. Configure Nginx to proxy /  → http://127.0.0.1:8000 (Kong)"
echo -e "   2. Point the Next.js app env to this self-hosted Supabase URL"
echo -e "   3. Run migrations against the new DB"
echo -e "   4. To access Studio: ssh -L 3001:localhost:3000 ${VPS_USER}@${VPS_HOST}"
echo -e "      then: docker compose --profile tools up -d"
echo ""
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
