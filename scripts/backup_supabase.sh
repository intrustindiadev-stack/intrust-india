#!/bin/bash
# =============================================================================
# backup_supabase.sh
# =============================================================================
# Wrapper script that defers to the new ops/automated_backup.sh
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_SCRIPT="${SCRIPT_DIR}/ops/automated_backup.sh"

if [[ -x "$OPS_SCRIPT" ]]; then
    exec "$OPS_SCRIPT"
else
    echo "[ERROR] Cannot find executable ops/automated_backup.sh"
    exit 1
fi
