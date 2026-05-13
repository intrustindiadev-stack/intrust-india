import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const admin = createAdminClient();
        const now = new Date().toISOString();

        const { data: items, error } = await admin
            .from('flash_sale_items')
            .select(`
                id,
                product_id,
                discount_percent,
                sale_price_paise,
                position,
                ends_at,
                starts_at,
                shopping_products:product_id (
                    id,
                    slug,
                    title,
                    product_images,
                    mrp_paise,
                    suggested_retail_price_paise,
                    admin_stock,
                    is_active
                )
            `)
            .eq('is_active', true)
            .or(`ends_at.is.null,ends_at.gt.${now}`)
            .lte('starts_at', now)
            .order('position', { ascending: true })
            .limit(5);

        if (error) throw error;

        // Filter and map to inventory-row shape
        const filteredItems = (items || [])
            .filter(row => {
                const p = row.shopping_products;
                return p && p.is_active;
            })
            .map(row => {
                const p = row.shopping_products;
                return {
                    id: `flash-${row.id}`,
                    product_id: p.id,
                    name: p.title,
                    original_price: p.mrp_paise || p.suggested_retail_price_paise,
                    sale_price: row.sale_price_paise,
                    discount_percent: row.discount_percent,
                    thumbnail: p.product_images?.[0] || null,
                    url: `/shop/product/${p.slug}`,
                    ends_at: row.ends_at,
                    shopping_products: {
                        admin_stock: p.admin_stock
                    }
                };
            });

        return NextResponse.json(
            { items: filteredItems },
            { headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (err) {
        console.error('[API] Public Flash Sale GET Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
