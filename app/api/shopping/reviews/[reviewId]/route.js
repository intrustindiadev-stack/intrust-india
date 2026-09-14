import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const updateSchema = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().max(120).optional().nullable(),
    comment: z.string().min(1).max(2000).optional(),
    mediaUrls: z.array(z.string().url()).max(4).optional(),
    status: z.enum(['published', 'hidden', 'pending_moderation']).optional(),
});

/**
 * PATCH /api/shopping/reviews/[reviewId]
 * Update a review (author can update content; admin can moderate status)
 */
export async function PATCH(request, { params }) {
    try {
        const { reviewId } = await params;
        if (!reviewId) {
            return NextResponse.json({ success: false, error: 'Review ID is required' }, { status: 400 });
        }

        const { user, profile, admin } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parseResult = updateSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { success: false, error: 'Validation error', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const { rating, title, comment, mediaUrls, status } = parseResult.data;

        // Fetch existing review
        const { data: review, error: fetchError } = await admin
            .from('product_reviews')
            .select('*')
            .eq('id', reviewId)
            .maybeSingle();

        if (fetchError || !review) {
            return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
        }

        const isOwner = review.user_id === user.id;
        const isAdmin = ['admin', 'super_admin'].includes(profile?.role);

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const updates = {
            updated_at: new Date().toISOString()
        };

        if (isOwner) {
            if (rating !== undefined) updates.rating = rating;
            if (title !== undefined) updates.title = title ? title.trim() : null;
            if (comment !== undefined) updates.comment = comment.trim();
            if (mediaUrls !== undefined) updates.media_urls = mediaUrls.slice(0, 4);
        }

        // Only admins can change moderation status
        if (status !== undefined) {
            if (!isAdmin) {
                return NextResponse.json({ success: false, error: 'Only admins can alter review status' }, { status: 403 });
            }
            updates.status = status;
        }

        const { data: updated, error: updateError } = await admin
            .from('product_reviews')
            .update(updates)
            .eq('id', reviewId)
            .select(`
                *,
                user_profile:user_profiles(full_name, avatar_url)
            `)
            .single();

        if (updateError) {
            console.error('[Review Edit API] Error updating review:', updateError);
            return NextResponse.json({ success: false, error: 'Failed to update review' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (err) {
        console.error('[Review Edit API] Unexpected error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/shopping/reviews/[reviewId]
 * Delete a review (owner or admin)
 */
export async function DELETE(request, { params }) {
    try {
        const { reviewId } = await params;
        if (!reviewId) {
            return NextResponse.json({ success: false, error: 'Review ID is required' }, { status: 400 });
        }

        const { user, profile, admin } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: review, error: fetchError } = await admin
            .from('product_reviews')
            .select('user_id, product_id')
            .eq('id', reviewId)
            .maybeSingle();

        if (fetchError || !review) {
            return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
        }

        const isOwner = review.user_id === user.id;
        const isAdmin = ['admin', 'super_admin'].includes(profile?.role);

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { error: deleteError } = await admin
            .from('product_reviews')
            .delete()
            .eq('id', reviewId);

        if (deleteError) {
            console.error('[Review Delete API] Error deleting review:', deleteError);
            return NextResponse.json({ success: false, error: 'Failed to delete review' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Review deleted successfully',
            productId: review.product_id
        });
    } catch (err) {
        console.error('[Review Delete API] Unexpected error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
