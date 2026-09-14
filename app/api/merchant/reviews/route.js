import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

/**
 * GET /api/merchant/reviews
 * Fetch reviews for products associated with the merchant
 */
export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = ['admin', 'super_admin'].includes(profile?.role);

        // Fetch merchant associated with user
        const { data: merchant, error: merchErr } = await admin
            .from('merchants')
            .select('id, business_name')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!merchant && !isAdmin) {
            return NextResponse.json({ success: false, error: 'Merchant profile not found' }, { status: 403 });
        }

        const merchantId = merchant?.id;

        // Find all product IDs for this merchant
        // 1. Submitted by merchant
        let productIds = [];
        let merchantProducts = [];

        if (merchantId) {
            const [submittedRes, invRes] = await Promise.all([
                admin
                    .from('shopping_products')
                    .select('id, title, product_images, slug')
                    .eq('submitted_by_merchant_id', merchantId)
                    .is('deleted_at', null),
                admin
                    .from('merchant_inventory')
                    .select('product_id, shopping_products(id, title, product_images, slug)')
                    .eq('merchant_id', merchantId)
            ]);

            const prodsMap = new Map();
            (submittedRes.data || []).forEach(p => prodsMap.set(p.id, p));
            (invRes.data || []).forEach(row => {
                if (row.shopping_products?.id) {
                    prodsMap.set(row.shopping_products.id, row.shopping_products);
                }
            });

            merchantProducts = Array.from(prodsMap.values());
            productIds = merchantProducts.map(p => p.id);
        } else if (isAdmin) {
            // Admin can see all or specified merchant
            const { data: allProds } = await admin
                .from('shopping_products')
                .select('id, title, product_images, slug')
                .is('deleted_at', null)
                .limit(100);
            merchantProducts = allProds || [];
            productIds = merchantProducts.map(p => p.id);
        }

        if (productIds.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    reviews: [],
                    totalCount: 0,
                    products: [],
                    page: 1,
                    limit: 10,
                    hasMore: false
                }
            });
        }

        const { searchParams } = new URL(request.url);
        const filterProductId = searchParams.get('productId');
        const filterRating = searchParams.get('rating') ? parseInt(searchParams.get('rating'), 10) : null;
        const filterNeedsReply = searchParams.get('needsReply') === 'true' || searchParams.get('needsReply') === '1';
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
        const offset = (page - 1) * limit;

        // Target products to query
        const queryProductIds = filterProductId && productIds.includes(filterProductId)
            ? [filterProductId]
            : productIds;

        let query = admin
            .from('product_reviews')
            .select(`
                *,
                shopping_products (id, title, product_images, slug),
                user_profiles (id, full_name, avatar_url),
                review_replies (id, merchant_id, reply_text, created_at, updated_at)
            `, { count: 'exact' })
            .in('product_id', queryProductIds)
            .order('created_at', { ascending: false });

        if (filterRating) {
            query = query.eq('rating', filterRating);
        }

        const { data: rawReviews, count, error: revErr } = await query
            .range(offset, offset + limit - 1);

        if (revErr) {
            console.error('[Merchant Reviews API] Error querying reviews:', revErr);
            return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
        }

        let reviews = rawReviews || [];
        if (filterNeedsReply) {
            reviews = reviews.filter(r => !r.review_replies || (Array.isArray(r.review_replies) && r.review_replies.length === 0));
        }

        return NextResponse.json({
            success: true,
            data: {
                reviews,
                totalCount: count || reviews.length,
                products: merchantProducts,
                page,
                limit,
                hasMore: (offset + limit) < (count || 0)
            }
        });
    } catch (err) {
        console.error('[Merchant Reviews API] Unexpected error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
