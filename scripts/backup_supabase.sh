#!/bin/bash

# Configuration
PROJECT_REF="bhgbylyzlwmmabegxlfc"
POOLER_HOST="aws-1-ap-south-1.pooler.supabase.com"
DATABASE="postgres"
USER="postgres.bhgbylyzlwmmabegxlfc"
PASSWORD="intrustdev@2026"
DATE=$(date +"%Y-%m-%d")
OUTPUT_FILENAME="supabase_backup_${DATE}.sql"
ERROR_LOG="dump_error.log"

# Setup local pg_dump paths relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_PG_DUMP="${SCRIPT_DIR}/pg_client/usr/bin/pg_dump"
LOCAL_LIB_DIR="${SCRIPT_DIR}/pg_client/usr/lib"

# Colors for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}--- Starting Supabase Database Backup ($DATE) ---${NC}"
echo "Target: $PROJECT_REF ($POOLER_HOST)"

# Export password temporarily for pg_dump
export PGPASSWORD="$PASSWORD"

# Add local library path for libpq.so.5 dependency
export LD_LIBRARY_PATH="${LOCAL_LIB_DIR}:${LD_LIBRARY_PATH}"

# Execute pg_dump
"$LOCAL_PG_DUMP" --host="$POOLER_HOST" --port=5432 --username="$USER" --dbname="$DATABASE" --format=plain --file="$OUTPUT_FILENAME" --verbose 2> "$ERROR_LOG"
EXIT_CODE=$?

# Clear password environment variable for security
unset PGPASSWORD

if [ $EXIT_CODE -eq 0 ]; then
    # Calculate file size in MB
    if [ -f "$OUTPUT_FILENAME" ]; then
        FILE_SIZE_BYTES=$(stat -c%s "$OUTPUT_FILENAME" 2>/dev/null || stat -f%z "$OUTPUT_FILENAME" 2>/dev/null || echo 0)
        FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE_BYTES / 1048576" | bc 2>/dev/null || awk "BEGIN {printf \"%.2f\", $FILE_SIZE_BYTES/1048576}" 2>/dev/null || echo "unknown")
        echo -e "${GREEN}SUCCESS: Backup created successfully!${NC}"
        echo "File: $OUTPUT_FILENAME ($FILE_SIZE_MB MB)"
    else
        echo -e "${RED}ERROR: Backup file was not created.${NC}"
    fi
else
    echo -e "${RED}ERROR: pg_dump failed with exit code $EXIT_CODE${NC}"
    echo "Check $ERROR_LOG for details."
    if [ -f "$ERROR_LOG" ]; then
        echo "Error log contents:"
        cat "$ERROR_LOG"
    fi
fi

echo "--- Backup Task Complete ---"
