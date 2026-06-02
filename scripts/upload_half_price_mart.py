import csv
import json
import uuid
import os
import urllib.request
import re

URL = "https://bhgbylyzlwmmabegxlfc.supabase.co"
KEY = os.environ.get("SUPABASE_KEY", "").strip()

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    return text + '-' + uuid.uuid4().hex[:8]

def chunk_list(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

def main():
    if not KEY:
        print("SUPABASE_KEY environment variable is required")
        return

    merchant_id = '626a74db-33ce-4bc2-b479-7a70bab621ee'
    products = []
    inventory = []

    with open('half_price_mart_products.csv', 'r', encoding='latin1') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                wholesale_price = float(row.get('wholesale_price') or 0)
            except ValueError:
                wholesale_price = 0
            
            try:
                selling_price = float(row.get('selling_price') or 0)
            except ValueError:
                selling_price = 0
                
            try:
                mrp = float(row.get('mrp') or 0)
            except ValueError:
                mrp = 0
                
            try:
                stock = int(row.get('stock') or 0)
            except ValueError:
                stock = 0
                
            try:
                gst = int(row.get('gst_percent') or 0)
            except ValueError:
                gst = 0

            images = []
            if row.get('image_url_1'): images.append(row['image_url_1'].strip())
            if row.get('image_url_2'): images.append(row['image_url_2'].strip())
            if row.get('image_url_3'): images.append(row['image_url_3'].strip())

            is_active_val = str(row.get('is_active') or '').lower()
            is_active = is_active_val in ('true', '1', 'yes') if is_active_val else True
            
            title = row.get('title') or 'Untitled'
            product_id = str(uuid.uuid4())
            
            wp_paise = int(wholesale_price * 100)
            sp_paise = int(selling_price * 100)
            mrp_paise = int(mrp * 100)
            
            if wp_paise > sp_paise:
                wp_paise = sp_paise

            products.append({
                'id': product_id,
                'title': title,
                'description': row.get('description') or None,
                'category': row.get('category') or None,
                'wholesale_price_paise': wp_paise,
                'suggested_retail_price_paise': sp_paise,
                'mrp_paise': mrp_paise,
                'cost_price_paise': wp_paise,
                'admin_stock': 0,
                'gst_percentage': gst,
                'hsn_code': row.get('hsn_code') or None,
                'product_images': images,
                'slug': slugify(title),
                'submitted_by_merchant_id': merchant_id,
                'approval_status': 'live',
                'platform_listed': False,
                'is_active': is_active
            })
            
            inventory.append({
                'id': str(uuid.uuid4()),
                'merchant_id': merchant_id,
                'product_id': product_id,
                'retail_price_paise': int(selling_price * 100),
                'stock_quantity': stock,
                'is_active': is_active,
                'is_platform_product': False
            })

    headers = {
        'apikey': KEY,
        'Authorization': f'Bearer {KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

    # Upload products in chunks
    for i, chunk in enumerate(chunk_list(products, 500)):
        req = urllib.request.Request(
            f"{URL}/rest/v1/shopping_products",
            data=json.dumps(chunk).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        try:
            with urllib.request.urlopen(req) as response:
                print(f"Products chunk {i+1} uploaded, status: {response.status}")
        except urllib.error.HTTPError as e:
            print(f"HTTP Error uploading products chunk {i+1}: {e.code}")
            print(e.read().decode('utf-8'))
            return
        except Exception as e:
            print(f"Error uploading products chunk {i+1}: {e}")
            return

    # Upload inventory in chunks
    for i, chunk in enumerate(chunk_list(inventory, 500)):
        req = urllib.request.Request(
            f"{URL}/rest/v1/merchant_inventory",
            data=json.dumps(chunk).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        try:
            with urllib.request.urlopen(req) as response:
                print(f"Inventory chunk {i+1} uploaded, status: {response.status}")
        except Exception as e:
            print(f"Error uploading inventory chunk {i+1}: {e}")
            return

    print("Upload complete!")

if __name__ == "__main__":
    main()
