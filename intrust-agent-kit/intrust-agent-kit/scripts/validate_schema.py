"""
validate_schema.py — run plpgsql_check on all public functions and verify views.

Exits with code 0 on PASS, 1 on any schema errors found.
Agents MUST run this after applying any migration.

Usage:
    python scripts/validate_schema.py
"""

import sys
from vps_config import exec_sql, PG_ADMIN_ROLE

VALIDATION_SQL = """
CREATE EXTENSION IF NOT EXISTS plpgsql_check;

-- Check for broken views
DO $$
DECLARE v_record RECORD;
BEGIN
    FOR v_record IN
        SELECT table_schema, table_name
        FROM information_schema.views
        WHERE table_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('SELECT 1 FROM %I.%I LIMIT 1', v_record.table_schema, v_record.table_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'SCHEMA_ERROR: BROKEN VIEW: %.% - %',
                v_record.table_schema, v_record.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Check plpgsql functions for errors
SELECT
    p.proname AS function_name,
    err.functionid::regprocedure,
    err.message,
    err.detail,
    err.hint,
    err.context
FROM
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid,
    LATERAL plpgsql_check_function(p.oid) err
WHERE
    n.nspname = 'public'
    AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
    AND err.message NOT LIKE 'never read variable%'
    AND err.message NOT LIKE 'variable%is declared but never used%'
    AND err.message NOT LIKE 'out parameter%is not assigned%'
    AND err.message NOT LIKE 'parameter%is never read%'
    AND err.message NOT LIKE 'too many%parameters%';
"""

print("Running schema validation...")
out, err = exec_sql(VALIDATION_SQL, role=PG_ADMIN_ROLE)

errors = []
for line in err.split("\n"):
    if "SCHEMA_ERROR:" in line:
        errors.append(line.strip())

out_lines = [l.strip() for l in out.split("\n") if l.strip()]
for line in out_lines:
    if "|" in line:
        errors.append("FUNCTION_ERROR: " + line)

if errors:
    print("❌ SCHEMA VALIDATION FAILED:")
    for e in errors:
        print("  -", e)
    sys.exit(1)
else:
    print("✅ SCHEMA VALIDATION PASSED")
    sys.exit(0)
