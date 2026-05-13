import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q')?.trim();

        if (!q || q.length < 2) {
            return NextResponse.json({ products: [] });
        }

        const { data: products, error } = await admin
            .from('shopping_products')
            .select('id, slug, title, product_images, mrp_paise, suggested_retail_price_paise, admin_stock, is_active')
            .eq('is_active', true)
            .is('deleted_at', null)
            .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
            .limit(20);

        if (error) throw error;

        const mapped = (products || []).map(p => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            product_images: p.product_images,
            mrp_paise: p.mrp_paise,
            suggested_retail_price_paise: p.suggested_retail_price_paise
        }));

        return NextResponse.json({ products: mapped });
    } catch (err) {
        console.error('[API] Admin Product Search GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
