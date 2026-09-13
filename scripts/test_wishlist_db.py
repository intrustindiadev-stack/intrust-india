"""
Test user_wishlists table schema and content on VPS DB
"""
from vps_config import exec_sql

def run():
    print("--- 1. user_wishlists table columns ---")
    out, err = exec_sql("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'user_wishlists'
        ORDER BY ordinal_position;
    """)
    print(out)
    if err: print("ERR:", err)

    print("\n--- 2. Foreign Keys on user_wishlists ---")
    out, err = exec_sql("""
        SELECT
            tc.constraint_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='user_wishlists';
    """)
    print(out)
    if err: print("ERR:", err)

    print("\n--- 3. Row count in user_wishlists ---")
    out, err = exec_sql("SELECT count(*) FROM public.user_wishlists;")
    print(out)
    if err: print("ERR:", err)

    print("\n--- 4. Sample rows from user_wishlists ---")
    out, err = exec_sql("SELECT * FROM public.user_wishlists LIMIT 5;")
    print(out)
    if err: print("ERR:", err)

    print("\n--- 5. Test Join with shopping_products, fashion_variants, merchants ---")
    out, err = exec_sql("""
        SELECT 
            w.id, w.user_id, w.product_id, w.variant_id, w.inventory_id, w.is_platform_item,
            p.title AS product_title, p.slug AS product_slug,
            m.business_name AS merchant_name
        FROM public.user_wishlists w
        LEFT JOIN public.shopping_products p ON w.product_id = p.id
        LEFT JOIN public.merchants m ON w.merchant_id = m.id
        LIMIT 5;
    """)
    print(out)
    if err: print("ERR:", err)

if __name__ == "__main__":
    run()
