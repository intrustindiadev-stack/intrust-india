import { z } from 'zod';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const pgUuid = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'Invalid UUID');

const replySchema = z.object({
    replyText: z.string().min(1, 'Reply cannot be empty').max(1000, 'Reply cannot exceed 1000 characters'),
    merchantId: pgUuid.optional(),
});

/**
 * POST /api/merchant/reviews/[reviewId]/reply
 * Upsert merchant official reply to a customer review
 */
export async function POST(request, { params }) {
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
        const parseResult = replySchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { success: false, error: 'Validation error', details: parseResult.error.format() },
                { status: 400 }
            );
        }

        const { replyText, merchantId: requestedMerchantId } = parseResult.data;
        const isAdmin = ['admin', 'super_admin'].includes(profile?.role);

        // Fetch review to determine product
        const { data: review, error: revErr } = await admin
            .from('product_reviews')
            .select('id, product_id')
            .eq('id', reviewId)
            .maybeSingle();

        if (revErr || !review) {
            return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
        }

        // Determine merchant authorization
        let effectiveMerchantId = null;

        if (isAdmin) {
            effectiveMerchantId = requestedMerchantId || null;
        } else {
            // Must own a merchant that sells or submitted this product
            const { data: merchant } = await admin
                .from('merchants')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!merchant) {
                return NextResponse.json({ success: false, error: 'Merchant profile not found' }, { status: 403 });
            }

            effectiveMerchantId = merchant.id;

            // Verify product is linked to this merchant
            const [submittedCheck, invCheck] = await Promise.all([
                admin
                    .from('shopping_products')
                    .select('id')
                    .eq('id', review.product_id)
                    .eq('submitted_by_merchant_id', merchant.id)
                    .maybeSingle(),
                admin
                    .from('merchant_inventory')
                    .select('id')
                    .eq('product_id', review.product_id)
                    .eq('merchant_id', merchant.id)
                    .maybeSingle()
            ]);

            if (!submittedCheck.data && !invCheck.data) {
                return NextResponse.json(
                    { success: false, error: 'You are not authorized to reply to reviews for this product' },
                    { status: 403 }
                );
            }
        }

        // Upsert into review_replies (one reply per review)
        const nowIso = new Date().toISOString();
        const { data: savedReply, error: replyErr } = await admin
            .from('review_replies')
            .upsert({
                review_id: reviewId,
                merchant_id: effectiveMerchantId,
                replied_by: user.id,
                reply_text: replyText.trim(),
                updated_at: nowIso
            }, { onConflict: 'review_id' })
            .select('*')
            .single();

        if (replyErr) {
            console.error('[Merchant Reply API] Error upserting reply:', replyErr);
            return NextResponse.json({ success: false, error: 'Failed to save reply' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: savedReply
        });
    } catch (err) {
        console.error('[Merchant Reply API] Unexpected error:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
