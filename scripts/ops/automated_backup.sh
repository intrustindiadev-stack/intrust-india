#!/usr/bin/env bash
# =============================================================================
# automated_backup.sh
# =============================================================================
# Dumps Postgres, exports the storage-data volume, compresses and encrypts 
# them, and enforces retention.
#
# Requires:
#   /etc/intrust/ops.conf containing:
#     DB_PASS="postgres_password"
#     BACKUP_ENCRYPTION_PASSPHRASE="your_secure_passphrase"
# =============================================================================
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
CONFIG_FILE="/etc/intrust/ops.conf"
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "[ERROR] Missing config file: $CONFIG_FILE"
    exit 1
fi
source "$CONFIG_FILE"

if [[ -z "${DB_PASS:-}" || -z "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]]; then
    echo "[ERROR] DB_PASS or BACKUP_ENCRYPTION_PASSPHRASE missing in ops.conf"
    exit 1
fi

DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
BACKUP_DIR="/var/www/intrustindia.com/backups"
RETENTION_DAYS=7
DATE=$(date +"%Y-%m-%d_%H%M%S")

mkdir -p "$BACKUP_DIR"

# ─── 1. Postgres Logical Dump ────────────────────────────────────────────────
echo "[INFO] Starting Postgres Dump..."
DUMP_FILE="${BACKUP_DIR}/db_${DATE}.sql"
export PGPASSWORD="$DB_PASS"

if ! pg_dump --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" --format=plain --file="$DUMP_FILE"; then
    echo "[ERROR] pg_dump failed!"
    unset PGPASSWORD
    exit 1
fi
unset PGPASSWORD
echo "[OK] Postgres Dump created: $DUMP_FILE"

# ─── 2. Storage Volume Tarball ───────────────────────────────────────────────
echo "[INFO] Starting Storage Archive..."
STORAGE_DIR="/var/www/intrustindia.com/supabase-stack/volumes/storage"
STORAGE_TAR="${BACKUP_DIR}/storage_${DATE}.tar.gz"

if [ -d "$STORAGE_DIR" ]; then
    # Use sudo to read root-owned storage files
    if ! sudo tar -czf "$STORAGE_TAR" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"; then
        echo "[ERROR] Storage tarball failed!"
        exit 1
    fi
    echo "[OK] Storage Archive created: $STORAGE_TAR"
else
    echo "[WARN] Storage directory not found at $STORAGE_DIR, skipping..."
fi

# ─── 3. Compress & Encrypt (AES-256) ─────────────────────────────────────────
echo "[INFO] Encrypting backups..."

encrypt_file() {
    local file="$1"
    if [ -f "$file" ]; then
        openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -pass "pass:$BACKUP_ENCRYPTION_PASSPHRASE" -in "$file" -out "${file}.enc"
        rm "$file"
        echo "[OK] Encrypted: ${file}.enc"
    fi
}

encrypt_file "$DUMP_FILE"
if [[ -f "${DUMP_FILE}.enc" ]]; then
    # We compress the sql before encryption actually, but pg_dump was plain. Let's just encrypt.
    # Actually, let's gzip then encrypt for space savings:
    gzip "${DUMP_FILE}" 2>/dev/null || true
    if [[ -f "${DUMP_FILE}.gz" ]]; then
        encrypt_file "${DUMP_FILE}.gz"
    fi
fi

encrypt_file "$STORAGE_TAR"

# ─── 4. Retention Policy ─────────────────────────────────────────────────────
echo "[INFO] Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "*.enc" -mtime +$RETENTION_DAYS -exec rm -f {} \;

echo "[OK] Backup process complete."
