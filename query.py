import psycopg2
import os

def get_schema():
    conn = psycopg2.connect("postgresql://postgres:postgres@187.124.98.130:5432/postgres")
    cur = conn.cursor()
    cur.execute("""
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
    """)
    tables = {}
    for row in cur.fetchall():
        table = row[0]
        col = f"{row[1]} ({row[2]})"
        if table not in tables: tables[table] = []
        tables[table].append(col)
    for table, cols in tables.items():
        if any(t in table for t in ('career_applications', 'user_profiles', 'teams', 'team_members', 'panel', 'request', 'notification', 'audit')):
            print(f"\n{table}:")
            for col in cols:
                print(f"  {col}")
