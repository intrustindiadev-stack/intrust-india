"""
query_db.py — run a SQL query against the VPS Supabase DB and print results.

Usage (pipe SQL via stdin):
    echo "SELECT count(*) FROM public.leads;" | python scripts/query_db.py

Usage (from a .sql file):
    python scripts/query_db.py < my_query.sql

Usage (inline with -c flag):
    python scripts/query_db.py -c "SELECT id, phone FROM auth.users LIMIT 5;"
"""

import sys
import argparse
from vps_config import exec_sql, PG_ROLE

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("-c", "--command", help="SQL to run inline")
    parser.add_argument("--role", default=PG_ROLE, help="PostgreSQL role to use (default: postgres)")
    args = parser.parse_args()

    if args.command:
        sql = args.command
    elif not sys.stdin.isatty():
        sql = sys.stdin.read()
    else:
        print("ERROR: provide SQL via -c flag or stdin.")
        print(__doc__)
        sys.exit(1)

    out, err = exec_sql(sql.strip(), role=args.role)
    if out.strip():
        print(out.strip())
    if err.strip():
        print("STDERR:", err.strip(), file=sys.stderr)

if __name__ == "__main__":
    main()
