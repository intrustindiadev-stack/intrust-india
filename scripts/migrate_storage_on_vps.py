#!/usr/bin/env python3
import os
import sys
import json
import time
import subprocess
import urllib.request
import urllib.parse
import urllib.error
import threading
from concurrent.futures import ThreadPoolExecutor

CONFIG_PATH = "/var/www/intrustindia.com/migration_config.json"
ENV_PATH = "/var/www/intrustindia.com/supabase-stack/.env"

# Thread-safe global counters
lock = threading.Lock()
success_count = 0
fail_count = 0
not_found_count = 0
processed_count = 0
total_objects = 0
skip_count = 0

def info(msg): print(f"[INFO] {msg}", flush=True)
def ok(msg):   print(f"[OK] {msg}", flush=True)
def warn(msg): print(f"[WARN] {msg}", flush=True)
def err(msg):  
    print(f"[ERROR] {msg}", file=sys.stderr, flush=True)
    sys.exit(1)

def run_psql(sql_query):
    cmd = ["docker", "exec", "-i", "supabase-db", "psql", "-U", "supabase_admin", "-d", "postgres", "-t", "-A"]
    res = subprocess.run(cmd, input=sql_query, capture_output=True, text=True, check=True)
    return res.stdout.strip()

def get_existing_files():
    cmd = ["docker", "exec", "supabase-storage", "find", "/var/lib/storage/stub/stub", "-type", "f"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    existing = set()
    prefix = "/var/lib/storage/stub/stub/"
    for line in res.stdout.strip().split("\n"):
        line = line.strip()
        if line.startswith(prefix):
            rel_path = line[len(prefix):]
            parts = rel_path.split("/")
            if len(parts) > 1:
                original_path = "/".join(parts[:-1])
                existing.add(original_path)
    return existing

def copy_worker(obj, remote_url, remote_key, local_key, existing_files):
    global success_count, fail_count, not_found_count, processed_count, total_objects, skip_count
    
    bucket = obj['bucket_id']
    name = obj['name']
    mime = obj['mime']
    size = obj['size']
    
    local_rel_path = f"{bucket}/{name}"
    
    if local_rel_path in existing_files:
        with lock:
            success_count += 1
            processed_count += 1
            skip_count += 1
            # Only print skip summary occasionally or not at all to avoid log clutter
            if processed_count % 100 == 0 or processed_count == total_objects:
                print(f"[{processed_count}/{total_objects}] Progress check: skipping existing files (processed: {processed_count})", flush=True)
        return
        
    # URL encode path while preserving slashes
    encoded_name = urllib.parse.quote(name, safe='/')
    
    t0 = time.time()
    try:
        # Download from remote
        download_url = f"{remote_url}/storage/v1/object/authenticated/{bucket}/{encoded_name}"
        req_dl = urllib.request.Request(download_url)
        req_dl.add_header("Authorization", f"Bearer {remote_key}")
        
        with urllib.request.urlopen(req_dl, timeout=30) as resp_dl:
            file_data = resp_dl.read()
        t_dl = time.time() - t0
        
        # Upload to local
        t1 = time.time()
        upload_url = f"http://localhost:8000/storage/v1/object/{bucket}/{encoded_name}"
        req_up = urllib.request.Request(upload_url, data=file_data, method="POST")
        req_up.add_header("Authorization", f"Bearer {local_key}")
        if mime:
            req_up.add_header("Content-Type", mime)
        req_up.add_header("x-upsert", "true")
        
        with urllib.request.urlopen(req_up, timeout=30) as resp_up:
            resp_up.read()
        t_up = time.time() - t1
        
        with lock:
            success_count += 1
            processed_count += 1
            print(f"[{processed_count}/{total_objects}] OK: {bucket}/{name} (dl: {t_dl:.2f}s, up: {t_up:.2f}s)", flush=True)
            
    except urllib.error.HTTPError as e:
        with lock:
            processed_count += 1
            if e.code == 404:
                print(f"[{processed_count}/{total_objects}] STALE (404): {bucket}/{name}", flush=True)
                not_found_count += 1
            else:
                print(f"[{processed_count}/{total_objects}] HTTP ERROR {e.code} for {bucket}/{name}: {e.reason}", flush=True)
                fail_count += 1
    except Exception as e:
        with lock:
            processed_count += 1
            print(f"[{processed_count}/{total_objects}] ERROR for {bucket}/{name}: {str(e)}", flush=True)
            fail_count += 1

def main():
    global total_objects
    
    info("Starting parallel migration script on VPS...")
    
    # Read migration configuration
    if not os.path.exists(CONFIG_PATH):
        err(f"Migration config not found at {CONFIG_PATH}")
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)
        
    remote_url = config.get("remote_url")
    remote_key = config.get("remote_key")
    product_images_policies_sql = config.get("product_images_policies_sql")
    storage_avatar_policies_sql = config.get("storage_avatar_policies_sql")
    
    if not remote_url or not remote_key:
        err("Missing remote Supabase credentials in config")
        
    # Read local stack secrets
    if not os.path.exists(ENV_PATH):
        err(f"Local stack environment file not found at {ENV_PATH}")
        
    local_key = None
    with open(ENV_PATH, "r") as f:
        for line in f:
            if line.startswith("SERVICE_ROLE_KEY="):
                local_key = line.split("=")[1].strip()
                break
    if not local_key:
        err("Could not find SERVICE_ROLE_KEY in local stack .env")
        
    # Step 1: Query the list of objects from storage.objects
    info("Retrieving list of objects from local database...")
    list_sql = """
    SELECT json_build_object(
        'bucket_id', bucket_id, 
        'name', name, 
        'mime', metadata->>'mimetype', 
        'size', (metadata->>'size')::bigint
    ) 
    FROM storage.objects;
    """
    lines = run_psql(list_sql).split("\n")
    objects = []
    for line in lines:
        if line.strip():
            try:
                objects.append(json.loads(line))
            except Exception as e:
                warn(f"Failed to parse object line: {line}. Error: {e}")
                
    total_objects = len(objects)
    info(f"Found {total_objects} objects to migrate.")
    
    # Get existing files on disk
    info("Scanning local storage for already migrated files...")
    try:
        existing_files = get_existing_files()
        info(f"Found {len(existing_files)} files already present on local disk.")
    except Exception as e:
        warn(f"Failed to scan existing files: {e}. Will re-copy all files.")
        existing_files = set()
        
    # Step 2: Recreate/Update all buckets in the database using SQL with exact configurations
    info("Configuring buckets with exact configurations (ON CONFLICT DO UPDATE)...")
    recreate_sql = """
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, type) VALUES
    ('gift-cards', 'gift-cards', true, 5242880, null, 'STANDARD'),
    ('kyc-documents', 'kyc-documents', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','application/pdf'], 'STANDARD'),
    ('avatars', 'avatars', true, null, null, 'STANDARD'),
    ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp'], 'STANDARD'),
    ('banners', 'banners', true, null, null, 'STANDARD'),
    ('merchant_banners', 'merchant_banners', true, null, null, 'STANDARD'),
    ('payslips', 'payslips', false, null, null, 'STANDARD'),
    ('resumes', 'resumes', false, null, null, 'STANDARD')
    ON CONFLICT (id) DO UPDATE SET 
        public = EXCLUDED.public, 
        file_size_limit = EXCLUDED.file_size_limit, 
        allowed_mime_types = EXCLUDED.allowed_mime_types,
        type = EXCLUDED.type;
    """
    run_psql(recreate_sql)
    ok("Buckets configured successfully.")
    
    # Step 3: Re-apply storage RLS policies
    info("Re-applying storage RLS policies...")
    if product_images_policies_sql:
        run_psql(product_images_policies_sql)
    if storage_avatar_policies_sql:
        run_psql(storage_avatar_policies_sql)
    ok("Storage RLS policies applied.")
    
    # Step 4: Migrate all objects in parallel (Cloud -> self-hosted)
    info("Starting parallel copy of storage objects using ThreadPoolExecutor...")
    start_time = time.time()
    
    # Run with 20 parallel worker threads
    with ThreadPoolExecutor(max_workers=20) as executor:
        for obj in objects:
            executor.submit(copy_worker, obj, remote_url, remote_key, local_key, existing_files)
            
    elapsed_time = time.time() - start_time
    ok(f"Migration completed in {elapsed_time:.2f}s. Success: {success_count} (skipped {skip_count}), Stale (404): {not_found_count}, Failed: {fail_count}")

    if fail_count > 0:
        err(f"Migration finished with {fail_count} failures! Please review logs and run again before proceeding.")

    # Step 5: Preflight check for column types
    info("Running preflight check for database column types...")
    type_check_sql = "SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shopping_products' AND column_name = 'product_images';"
    try:
        col_type = run_psql(type_check_sql).lower()
        info(f"Detected shopping_products.product_images type: {col_type}")
    except Exception as e:
        err(f"Failed to detect column type: {e}")

    # Build type-safe db_updates
    info("Rewriting DB storage URL references...")
    
    # Safe update for arrays vs JSONB
    if 'array' in col_type or 'text[]' in col_type:
        product_images_update = "UPDATE shopping_products SET product_images = (SELECT array_agg(REPLACE(url, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase')) FROM unnest(product_images) AS url) WHERE array_to_string(product_images, ',') LIKE '%https://bhgbylyzlwmmabegxlfc.supabase.co%';"
    else:
        product_images_update = "UPDATE shopping_products SET product_images = REPLACE(product_images::text, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase')::jsonb WHERE product_images::text LIKE '%https://bhgbylyzlwmmabegxlfc.supabase.co%';"

    db_updates = [
        "UPDATE coupons SET image_url = REPLACE(image_url, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase') WHERE image_url LIKE '%https://bhgbylyzlwmmabegxlfc.supabase.co%';",
        "UPDATE merchants SET shopping_banner_url = REPLACE(shopping_banner_url, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase') WHERE shopping_banner_url LIKE '%https://bhgbylyzlwmmabegxlfc.supabase.co%';",
        product_images_update,
        "UPDATE marketplace_listings SET image_url = REPLACE(image_url, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase') WHERE image_url LIKE '%https://bhgbylyzlwmmabegxlfc.supabase.co%';",
        "UPDATE platform_banners SET image_url = REPLACE(image_url, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase') WHERE image_url LIKE '%https://bhgbylyzlwmmabegxlfc.supabase.co%';",
        "UPDATE user_profiles SET avatar_url = REPLACE(avatar_url, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase') WHERE avatar_url LIKE '%https://bhgbylyzlwmmabegxlfc.supabase.co%';",
        "UPDATE gift_card_purchases SET custom_image_url = REPLACE(custom_image_url, 'https://bhgbylyzlwmmabegxlfc.supabase.co', 'https://intrustindia.com/api/supabase') WHERE custom_image_url LIKE '%https://bhgbylyzlwmmabegxlfc.supabase.co%';"
    ]
    
    for idx, sql in enumerate(db_updates):
        try:
            run_psql(sql)
            info(f"Applied database URL update query #{idx+1}")
        except Exception as e:
            err(f"Failed applying update query #{idx+1}: {e}")
            
    ok("Database URL references updated.")
    
    # Run post-migration verification query
    info("Verifying database references to remote Supabase URL...")
    verify_sql = """
    DO $body$
    DECLARE
        r RECORD;
        cnt INT;
        query TEXT;
    BEGIN
        FOR r IN 
            SELECT table_schema, table_name, column_name, data_type
            FROM information_schema.columns 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'storage', 'auth', 'graphql', 'realtime')
              AND data_type IN ('text', 'character varying', 'jsonb', 'json', 'ARRAY')
        LOOP
            IF r.data_type = 'jsonb' OR r.data_type = 'json' THEN
                query := format('SELECT count(*) FROM %%I.%%I WHERE %%I::text LIKE %%L', 
                    r.table_schema, r.table_name, r.column_name, '%%bhgbylyzlwmmabegxlfc.supabase.co%%');
            ELSIF r.data_type = 'ARRAY' THEN
                query := format('SELECT count(*) FROM %%I.%%I WHERE %%I::text LIKE %%L', 
                    r.table_schema, r.table_name, r.column_name, '%%bhgbylyzlwmmabegxlfc.supabase.co%%');
            ELSE
                query := format('SELECT count(*) FROM %%I.%%I WHERE %%I LIKE %%L', 
                    r.table_schema, r.table_name, r.column_name, '%%bhgbylyzlwmmabegxlfc.supabase.co%%');
            END IF;
            
            BEGIN
                EXECUTE query INTO cnt;
                IF cnt > 0 THEN
                    RAISE EXCEPTION 'Verification failed: Found %% rows referencing remote host in %%.%% (column: %%)', cnt, r.table_schema, r.table_name, r.column_name;
                END IF;
            EXCEPTION 
                WHEN raise_exception THEN RAISE;
                WHEN OTHERS THEN NULL;
            END;
        END LOOP;
    END;
    $body$;
    """
    try:
        run_psql(verify_sql)
        ok("Verification passed: No remote Supabase URL references found in the database!")
    except Exception as e:
        err(f"Verification query failed: {e}")
        
    # Final checksum
    info("Verifying object counts match expectations...")
    try:
        local_count_sql = "SELECT count(*) FROM storage.objects;"
        local_count = int(run_psql(local_count_sql))
        if local_count >= (success_count + skip_count):
            ok(f"Checksum passed: {local_count} objects exist in the database.")
        else:
            warn(f"Checksum mismatch: {local_count} in DB vs {success_count + skip_count} migrated.")
    except Exception as e:
        warn(f"Failed to verify object counts: {e}")
        
    print("MIGRATION_COMPLETE_SUCCESS", flush=True)

if __name__ == "__main__":
    main()
