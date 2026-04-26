import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = createAdminClient();

        // 1. Fetch active products from shopping_products
        // We fetch 16 items to allow for post-filtering to 8 items
        const { data: products, error: productsError } = await supabase
            .from('shopping_products')
            .select('id, title, category, suggested_retail_price_paise, mrp_paise, product_images, slug, admin_stock')
            .eq('is_active', true)
            .is('deleted_at', null)
            .not('product_images', 'is', null)
            .order('created_at', { ascending: false })
            .limit(16);

        if (productsError || !products || products.length === 0) {
            if (productsError) console.error('Error fetching trending products:', productsError);
            return NextResponse.json({ products: [] });
        }

        // 2. Fetch active inventory from merchant_inventory for these product IDs
        // This ensures the merchant is active and has stock
        const productIds = products.map(p => p.id);
        const { data: inventory, error: inventoryError } = await supabase
            .from('merchant_inventory')
            .select('product_id')
            .in('product_id', productIds)
            .eq('is_active', true)
            .gt('stock_quantity', 0);

        if (inventoryError) {
            console.error('Error fetching merchant inventory:', inventoryError);
        }

        // 3. Build a Set of product IDs that have at least one active inventory row
        const activeInventorySet = new Set(inventory?.map(i => i.product_id) || []);

        // 4. Filter products: keep if admin_stock > 0 OR has active inventory
        const filtered = products
            .filter(p => p.admin_stock > 0 || activeInventorySet.has(p.id))
            .slice(0, 8);

        return NextResponse.json({ products: filtered });
    } catch (error) {
        console.error('Trending products API error:', error);
        return NextResponse.json({ products: [] }, { status: 500 });
    }
}
