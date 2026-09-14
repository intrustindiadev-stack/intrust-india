import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

/**
 * POST /api/shopping/reviews/[reviewId]/helpful
 * Toggle helpful vote on a review.
 */
export async function POST(request, { params }) {
    try {
        const { reviewId } = await params;
        if (!reviewId) {
            return NextResponse.json({ success: false, error: 'Review ID is required' }, { status: 400 });
        }

        const { user } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Please log in to vote on reviews' },
                { status: 401 }
            );
        }

        const authSupabase = await createServerSupabaseClient();
        const { data, error } = await authSupabase.rpc('toggle_review_helpful', {
            p_review_id: reviewId
        });

        if (error) {
            if (error.code === '40300' || error.message?.includes('Cannot vote on your own review')) {
                return NextResponse.json(
                    { success: false, error: 'You cannot vote on your own review' },
                    { status: 403 }
                );
            }
            if (error.code === '40100' || error.message?.includes('Authentication required')) {
                return NextResponse.json(
                    { success: false, error: 'Please log in to vote on reviews' },
                    { status: 401 }
                );
            }
            if (error.code === '40400' || error.message?.includes('Review not found')) {
                return NextResponse.json(
                    { success: false, error: 'Review not found' },
                    { status: 404 }
                );
            }
            console.error('[Helpful API] Error toggling helpful vote:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to update vote' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data
        });
    } catch (err) {
        console.error('[Helpful API] Unexpected error:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/shopping/reviews/[reviewId]/helpful
 * Remove helpful vote if currently voted.
 */
export async function DELETE(request, { params }) {
    try {
        const { reviewId } = await params;
        const { user } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const authSupabase = await createServerSupabaseClient();
        // Check if voted, and if so, call toggle to remove
        const { data, error } = await authSupabase.rpc('toggle_review_helpful', {
            p_review_id: reviewId
        });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[Helpful API] Error in DELETE:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
