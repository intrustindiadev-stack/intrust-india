import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const pgUuid = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid UUID');

const moderateSchema = z.object({
    reviewId: pgUuid,
    status: z.enum(['published', 'hidden', 'pending_moderation']),
});

/**
 * GET /api/admin/shopping/reviews
 * Moderation queue: list all reviews across the platform
 */
export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status') || 'all';
        const ratingFilter = searchParams.get('rating') ? parseInt(searchParams.get('rating'), 10) : null;
        const search = (searchParams.get('search') || '').trim();
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
        const offset = (page - 1) * limit;

        // NOTE: `user_profiles` embed requires the explicit FK hint — see the
        // matching comment in app/api/merchant/reviews/route.js (PGRST201:
        // product_reviews <-> user_profiles has both a direct FK and a
        // many-to-many path via review_helpful_votes).
        let query = admin
            .from('product_reviews')
            .select(`
                *,
                shopping_products (id, title, product_images, slug),
                user_profiles!product_reviews_user_id_fkey (id, full_name, avatar_url, phone),
                review_replies (id, merchant_id, reply_text, created_at)
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (ratingFilter) {
            query = query.eq('rating', ratingFilter);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,comment.ilike.%${search}%`);
        }

        const { data: reviews, count, error } = await query.range(offset, offset + limit - 1);

        if (error) {
            console.error('[Admin Reviews API] Error querying reviews:', error);
            return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                reviews: reviews || [],
                totalCount: count || 0,
                page,
                limit,
                hasMore: (offset + limit) < (count || 0)
            }
        });
    } catch (err) {
        console.error('[Admin Reviews API] Unexpected error in GET:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/shopping/reviews
 * Moderate review status (publish or hide)
 */
export async function PATCH(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const parseResult = moderateSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { success: false, error: 'Validation failed', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const { reviewId, status } = parseResult.data;

        const { data: updated, error } = await admin
            .from('product_reviews')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', reviewId)
            .select(`
                *,
                shopping_products (id, title, product_images, slug),
                user_profiles!product_reviews_user_id_fkey (id, full_name, avatar_url)
            `)
            .single();

        if (error) {
            console.error('[Admin Reviews API] Error moderating review:', error);
            return NextResponse.json({ success: false, error: 'Failed to update review status' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Review marked as ${status}`,
            data: updated
        });
    } catch (err) {
        console.error('[Admin Reviews API] Unexpected error in PATCH:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
