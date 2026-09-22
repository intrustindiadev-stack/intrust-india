"""
check_marketing_migrations.py
Inspects VPS PostgreSQL database to verify which marketing tables,
constraints, and RPC functions currently exist, and lists unapplied migrations.

Usage:
    python scripts/check_marketing_migrations.py
"""

import sys
import os

# Add scripts/ to path if running directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vps_config import get_ssh_client, exec_sql, SUPABASE_CONTAINER, PG_ADMIN_ROLE

def main():
    print("=" * 60)
    print("🔍 INTRUST INDIA — MARKETING ENGINE MIGRATION AUDIT")
    print("=" * 60)
    
    # 1. Check applied migrations recorded in schema_migrations
    print("\n1. Checking supabase_migrations.schema_migrations...")
    sql_mig = "SELECT version, name FROM supabase_migrations.schema_migrations WHERE version >= '20260913000000' ORDER BY version;"
    out_mig, err_mig = exec_sql(sql_mig, role=PG_ADMIN_ROLE)
    if out_mig.strip():
        print(out_mig.strip())
    else:
        print("  (No migrations recorded >= 20260913000000 in schema_migrations table)")

    # 2. Check existence of Marketing Tables
    print("\n2. Checking Marketing Tables in public schema...")
    tables_to_check = [
        'marketing_settings',
        'marketing_share_links',
        'marketing_tracking_events',
        'daily_challenge_categories',
        'daily_challenge_questions',
        'daily_challenge_sponsorships',
        'daily_challenge_plays',
        'user_quiz_streaks',
        'marketing_targets',
        'marketing_target_claims'
    ]
    sql_tables = f"""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ({','.join(f"'{t}'" for t in tables_to_check)});
    """
    out_t, _ = exec_sql(sql_tables)
    found_tables = set(line.strip() for line in out_t.splitlines() if line.strip())
    for t in tables_to_check:
        status = "✅ EXISTS" if t in found_tables else "❌ MISSING"
        print(f"  - {t:<35} {status}")

    # 3. Check Marketing RPC Functions
    print("\n3. Checking Marketing RPC Functions in public schema...")
    funcs_to_check = [
        'submit_daily_challenge',
        'book_daily_challenge_sponsorship',
        'claim_marketing_target_reward',
        'process_marketing_referral_reward',
        'process_marketing_conversion_reward',
        'get_marketing_dashboard_stats',
        'get_user_quiz_streak'
    ]
    sql_funcs = f"""
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name IN ({','.join(f"'{f}'" for f in funcs_to_check)});
    """
    out_f, _ = exec_sql(sql_funcs)
    found_funcs = set(line.strip() for line in out_f.splitlines() if line.strip())
    for f in funcs_to_check:
        status = "✅ EXISTS" if f in found_funcs else "❌ MISSING"
        print(f"  - {f:<38} {status}")

    # 4. Check Check Constraints
    print("\n4. Checking Check Constraints...")
    sql_cc = """
    SELECT conname, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conname IN ('marketing_targets_metric_type_check', 'merchant_transactions_transaction_type_check');
    """
    out_cc, _ = exec_sql(sql_cc)
    if out_cc.strip():
        print(out_cc.strip())
    else:
        print("  (Constraints not found or default)")

    print("\n" + "=" * 60)
    print("📋 SUMMARY OF RECENT MIGRATION CANDIDATES (supabase/migrations/):")
    migrations_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "supabase", "migrations")
    recent = sorted(f for f in os.listdir(migrations_dir) if f.startswith("202609") and f.endswith(".sql"))
    for f in recent:
        print(f"  • {f}")
    print("=" * 60)

if __name__ == "__main__":
    main()
