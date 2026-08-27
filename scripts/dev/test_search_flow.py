import json
import paramiko

host = "187.124.98.130"
user = "intrustindia"
password = "Intrustdev@2026"

def run_db_query(sql):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=host, username=user, password=password)
        docker_cmd = f'''docker exec supabase-db psql -U postgres -d postgres -t -A -F "," -c "{sql}"'''
        stdin, stdout, stderr = client.exec_command(docker_cmd)
        out = stdout.read().decode('utf-8').strip()
        err = stderr.read().decode('utf-8').strip()
        if err and "ERR" in err:
            print("DB Error:", err)
        return out
    finally:
        client.close()

# Test queries against actual catalog
test_cases = [
    ("Exact product name", "Floral Summer Midi Dress"),
    ("Partial product name", "Floral"),
    ("Category search", "Groceries"),
    ("Brand search", "Parachute"),
    ("Fashion product search", "Premium Cotton T-Shirt"),
    ("Standard product search", "INDIA GATE MINI"),
    ("Invalid query", "xyz123nonexistentproduct999"),
    ("Multi-word query", "summer dress"),
    ("Multi-word inverted", "chips potato")
]

print("================================================================")
print("PHASE 2B — SEARCH & DISCOVERY FUNCTIONAL QA: DATABASE RUNNER")
print("================================================================")

for label, query in test_cases:
    print(f"\n--- Test: {label} (Query: '{query}') ---")
    words = [w.strip() for w in query.split() if len(w.strip()) > 1]
    
    # Build ILIKE condition matching our normalizer
    conds = [
        f"title ILIKE '%{query}%'",
        f"description ILIKE '%{query}%'",
        f"category ILIKE '%{query}%'"
    ]
    for w in words:
        conds.append(f"title ILIKE '%{w}%'")
        conds.append(f"category ILIKE '%{w}%'")
    
    where_clause = " OR ".join(conds)
    
    sql = f"""
    SELECT p.id, p.title, p.category, p.slug, 
           CASE WHEN EXISTS (SELECT 1 FROM fashion_product_categories fpc WHERE fpc.product_id = p.id) THEN true ELSE false END as is_fashion
    FROM shopping_products p
    WHERE p.is_active = true AND p.deleted_at IS NULL AND ({where_clause})
    LIMIT 5;
    """
    
    raw_res = run_db_query(sql)
    if not raw_res:
        print("  -> Results: 0 found (Empty state triggered)")
    else:
        lines = raw_res.split("\n")
        print(f"  -> Results ({len(lines)} returned):")
        for l in lines:
            parts = l.split(",")
            if len(parts) >= 5:
                pid, title, cat, slug, is_fashion = parts[0], parts[1], parts[2], parts[3], parts[4]
                route = f"/shop/fashion/product/{pid}" if is_fashion.lower() == 't' else f"/shop/product/{slug}"
                print(f"     • [{cat}] {title} -> URL: {route} (is_fashion: {is_fashion})")

print("\n================================================================")
print("QA TEST EXECUTION COMPLETED")
print("================================================================")
