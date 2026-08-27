import paramiko
import sys
import json

VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22

def execute_sql(sql):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD)
        # We need to escape single quotes properly or run via stdin.
        # It's better to pass it via stdin to docker exec psql
        docker_cmd = 'docker exec -i supabase-db psql -U postgres -d postgres'
        stdin, stdout, stderr = client.exec_command(docker_cmd)
        stdin.write(sql)
        stdin.close()
        
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out: print(out)
        if err: print("ERR:", err)
    finally:
        client.close()

seed_sql = """
DO $$ 
DECLARE
    v_root_women UUID;
    v_l2_clothing UUID;
    v_l3_dresses UUID;
    v_l4_midi UUID;
    v_product_id UUID;
    v_variant1 UUID;
    v_variant2 UUID;
BEGIN
    -- Only seed if the root category doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.fashion_categories WHERE slug = 'women') THEN
        
        -- Insert L1
        INSERT INTO public.fashion_categories (level, name, title, slug, path, description)
        VALUES (1, 'Women', 'Women''s Fashion', 'women', 'women', 'Discover the latest women''s fashion.')
        RETURNING id INTO v_root_women;
        
        -- Insert L2
        INSERT INTO public.fashion_categories (parent_id, level, name, title, slug, path)
        VALUES (v_root_women, 2, 'Clothing', 'Women''s Clothing', 'clothing', 'women/clothing')
        RETURNING id INTO v_l2_clothing;

        -- Insert L3
        INSERT INTO public.fashion_categories (parent_id, level, name, title, slug, path)
        VALUES (v_l2_clothing, 3, 'Dresses', 'Dresses', 'dresses', 'women/clothing/dresses')
        RETURNING id INTO v_l3_dresses;
        
        -- Insert L4
        INSERT INTO public.fashion_categories (parent_id, level, name, title, slug, path)
        VALUES (v_l3_dresses, 4, 'Midi Dresses', 'Midi Dresses', 'midi-dresses', 'women/clothing/dresses/midi-dresses')
        RETURNING id INTO v_l4_midi;

        -- Create a base shopping product
        INSERT INTO public.shopping_products (title, description, category, wholesale_price_paise, suggested_retail_price_paise, admin_stock, is_active)
        VALUES ('Floral Summer Midi Dress', 'A beautiful floral midi dress perfect for summer.', 'Apparel', 100000, 250000, 100, true)
        RETURNING id INTO v_product_id;

        -- Link to fashion category
        INSERT INTO public.fashion_product_categories (product_id, category_id, is_primary)
        VALUES (v_product_id, v_l4_midi, true);

        -- Create variants
        INSERT INTO public.fashion_variants (product_id, sku, color, size, fit, fabric, price_paise, compare_at_price_paise, inventory_quantity)
        VALUES (v_product_id, 'FSD-RED-S', 'Red', 'S', 'Regular', 'Cotton', 250000, 300000, 50)
        RETURNING id INTO v_variant1; 

        INSERT INTO public.fashion_variants (product_id, sku, color, size, fit, fabric, price_paise, compare_at_price_paise, inventory_quantity)
        VALUES 
            (v_product_id, 'FSD-RED-M', 'Red', 'M', 'Regular', 'Cotton', 250000, 300000, 30),
            (v_product_id, 'FSD-BLUE-S', 'Blue', 'S', 'Regular', 'Cotton', 250000, 300000, 20);
        
        -- Media
        INSERT INTO public.fashion_variant_media (variant_id, image_url, alt_text)
        VALUES (v_variant1, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800', 'Red floral dress front view');

        RAISE NOTICE 'Seeding completed successfully.';
    ELSE
        RAISE NOTICE 'Data already seeded.';
    END IF;
END $$;
"""

if __name__ == "__main__":
    print("Executing Seed SQL...")
    execute_sql(seed_sql)
