import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { fireAndForgetEmail } from '@/lib/email/dispatch';
import { sendMerchantAlert } from '@/lib/email';

const pgUuid = z.string().regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID'
);

const querySchema = z.object({
    productId: pgUuid,
    sort: z.enum(['recent', 'helpful', 'highest', 'lowest', 'verified']).optional().default('recent'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(20).optional().default(10),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    verifiedOnly: z.enum(['true', 'false', '1', '0']).optional().transform(v => v === 'true' || v === '1'),
    withMedia: z.enum(['true', 'false', '1', '0']).optional().transform(v => v === 'true' || v === '1'),
});

const postReviewSchema = z.object({
    productId: pgUuid,
    rating: z.number().int().min(1).max(5),
    title: z.string().max(120).optional().nullable(),
    comment: z.string().min(1, 'Review comment cannot be empty').max(2000, 'Review comment exceeds 2000 characters'),
    mediaUrls: z.array(z.string().url()).max(4, 'Maximum 4 images allowed').optional().default([]),
});

/**
 * GET /api/shopping/reviews
 * Fetch summary and paginated reviews for a product
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid query parameters', details: parsed.error.format() },
                { status: 400 }
            );
        }

        const { productId, sort, page, limit, rating, verifiedOnly, withMedia } = parsed.data;
        const supabase = await createServerSupabaseClient().catch(() => createAdminClient());

        // Fetch review summary and reviews list in parallel
        const [summaryResult, reviewsResult] = await Promise.all([
            supabase.rpc('get_product_review_summary', { p_product_id: productId }),
            supabase.rpc('get_product_reviews', {
                p_product_id: productId,
                p_sort: sort,
                p_page: page,
                p_limit: limit,
                p_min_rating: rating ?? null,
                p_verified_only: verifiedOnly ?? false,
                p_with_media: withMedia ?? false
            })
        ]);

        if (summaryResult.error) {
            console.error('[Reviews API] Error fetching summary:', summaryResult.error);
        }
        if (reviewsResult.error) {
            console.error('[Reviews API] Error fetching reviews:', reviewsResult.error);
            return NextResponse.json(
                { success: false, error: 'Failed to load reviews' },
                { status: 500 }
            );
        }

        const reviewsData = reviewsResult.data || {};
        const summaryData = summaryResult.data || {
            avg_rating: 0,
            review_count: 0,
            histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            verified_count: 0,
            with_media_count: 0
        };

        return NextResponse.json({
            success: true,
            data: {
                summary: summaryData,
                reviews: reviewsData.reviews || [],
                totalCount: reviewsData.total_count || 0,
                page: reviewsData.page || page,
                limit: reviewsData.limit || limit,
                hasMore: reviewsData.has_more ?? false
            }
        });
    } catch (error) {
        console.error('[Reviews API] Unexpected error in GET:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/shopping/reviews
 * Submit or update a product review with verified purchase detection
 */
export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized. Please log in to leave a review.' },
                { status: 401 }
            );
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const parseResult = postReviewSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { success: false, error: 'Validation failed', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const { productId, rating, title, comment, mediaUrls } = parseResult.data;

        // 1. Rate Limiting: Max 5 creates/updates per user within 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: dailyReviewCount, error: countError } = await admin
            .from('product_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('updated_at', twentyFourHoursAgo);

        if (!countError && dailyReviewCount !== null && dailyReviewCount >= 5) {
            // Check if this specific review already exists (updating same review is permitted)
            const { data: existingRev } = await admin
                .from('product_reviews')
                .select('id')
                .eq('product_id', productId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (!existingRev) {
                return NextResponse.json(
                    { success: false, error: 'Review submission limit reached (maximum 5 reviews per 24 hours). Please try again later.' },
                    { status: 429 }
                );
            }
        }

        // 2. Check product exists and is active
        const { data: product, error: prodError } = await admin
            .from('shopping_products')
            .select('id, is_active')
            .eq('id', productId)
            .is('deleted_at', null)
            .maybeSingle();

        if (prodError || !product) {
            return NextResponse.json(
                { success: false, error: 'Product not found or unavailable' },
                { status: 404 }
            );
        }

        // 3. Verified Purchase Check
        // Check shopping_order_groups + shopping_order_items (covers platform + merchant orders)
        let isVerified = false;
        let matchedOrderGroupId = null;

        const { data: orderItemMatch } = await admin
            .from('shopping_order_items')
            .select('group_id, shopping_order_groups!inner(id, customer_id, delivery_status, delivered_at)')
            .eq('product_id', productId)
            .eq('shopping_order_groups.customer_id', user.id)
            .or('delivery_status.eq.delivered,delivered_at.not.is.null', { foreignTable: 'shopping_order_groups' })
            .limit(1)
            .maybeSingle();

        if (orderItemMatch?.group_id) {
            isVerified = true;
            matchedOrderGroupId = orderItemMatch.group_id;
        } else {
            // Fallback to legacy shopping_orders
            const { data: legacyOrder } = await admin
                .from('shopping_orders')
                .select('id')
                .eq('product_id', productId)
                .eq('buyer_id', user.id)
                .eq('status', 'delivered')
                .limit(1)
                .maybeSingle();

            if (legacyOrder) {
                isVerified = true;
            }
        }

        // 4. Clean & validate media URLs (only permit https URLs)
        const safeMediaUrls = (mediaUrls || [])
            .filter(u => typeof u === 'string' && u.startsWith('http'))
            .slice(0, 4);

        // 5. Upsert review into product_reviews
        const nowIso = new Date().toISOString();
        const { data: savedReview, error: upsertError } = await admin
            .from('product_reviews')
            .upsert({
                product_id: productId,
                user_id: user.id,
                rating,
                title: title ? title.trim() : null,
                comment: comment.trim(),
                media_urls: safeMediaUrls,
                verified_purchase: isVerified,
                order_group_id: matchedOrderGroupId,
                status: 'published',
                updated_at: nowIso
            }, { onConflict: 'product_id,user_id' })
            .select(`
                *,
                user_profile:user_profiles(full_name, avatar_url)
            `)
            .single();

        if (upsertError) {
            console.error('[Reviews API] Error saving review:', upsertError);
            return NextResponse.json(
                { success: false, error: 'Failed to submit review' },
                { status: 500 }
            );
        }

        // Fire-and-forget alert to product merchant (if custom merchant product)
        fireAndForgetEmail(async () => {
            const { data: prodData } = await admin
                .from('shopping_products')
                .select('title, submitted_by_merchant_id, merchants:submitted_by_merchant_id(id, user_id, business_name, business_email)')
                .eq('id', productId)
                .maybeSingle();

            if (prodData?.merchants) {
                let mEmail = prodData.merchants.business_email;
                if (!mEmail && prodData.merchants.user_id) {
                    const { data: prof } = await admin
                        .from('user_profiles')
                        .select('email')
                        .eq('id', prodData.merchants.user_id)
                        .maybeSingle();
                    mEmail = prof?.email;
                }
                if (mEmail) {
                    await sendMerchantAlert({
                        type: 'new_review',
                        to: mEmail,
                        data: {
                            businessName: prodData.merchants.business_name || 'Valued Merchant',
                            productTitle: prodData.title,
                            rating,
                            comment,
                        },
                        actorId: user.id,
                        metadata: { reviewId: savedReview.id, productId },
                    });
                }
            }
        }, { category: 'merchant_ops', entityId: savedReview.id });

        // 6. Fetch fresh summary after trigger recalculation
        const { data: freshSummary } = await admin.rpc('get_product_review_summary', {
            p_product_id: productId
        });

        return NextResponse.json({
            success: true,
            data: savedReview,
            summary: freshSummary || null
        });
    } catch (error) {
        console.error('[Reviews API] Unexpected error in POST:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
