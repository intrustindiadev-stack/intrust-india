import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const correlationId = crypto.randomUUID();

    try {
        const supabaseAdmin = createAdminClient();

        // 1. Auth check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }

        // 2. KYC check
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('kyc_status, created_at')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        if (userProfile.kyc_status !== 'verified') {
            return NextResponse.json({ error: 'KYC Verification is required to request deferred payment. Please complete KYC from your profile.' }, { status: 403 });
        }

        // 3. Parse request body
        const { couponId, customerNote, durationDays } = await request.json();
        if (!couponId) {
            return NextResponse.json({ error: 'Missing couponId' }, { status: 400 });
        }

        // 4. Fetch coupon with merchant
        const { data: coupon, error: couponError } = await supabaseAdmin
            .from('coupons')
            .select('*, merchant:merchants(id, user_id, business_name)')
            .eq('id', couponId)
            .single();

        if (couponError || !coupon) {
            return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
        }

        if (coupon.status !== 'available') {
            return NextResponse.json({ error: 'This gift card is no longer available' }, { status: 400 });
        }

        if (!coupon.merchant_id || !coupon.merchant) {
            return NextResponse.json({ error: 'This gift card does not belong to a merchant' }, { status: 400 });
        }

        // 5. Check merchant has udhari enabled
        const { data: settings } = await supabaseAdmin
            .from('merchant_udhari_settings')
            .select('*')
            .eq('merchant_id', coupon.merchant_id)
            .single();

        if (!settings || !settings.udhari_enabled) {
            return NextResponse.json({ error: 'This merchant does not accept deferred payments' }, { status: 400 });
        }

        // 6. (Account age check removed — platform is newly launched)

        // 7. Check customer hasn't exceeded credit limit with this merchant
        const { data: activeRequests } = await supabaseAdmin
            .from('udhari_requests')
            .select('amount_paise')
            .eq('customer_id', user.id)
            .eq('merchant_id', coupon.merchant_id)
            .in('status', ['pending', 'approved']);

        const totalOutstanding = (activeRequests || []).reduce((sum, r) => sum + r.amount_paise, 0);
        const purchaseAmountPaise = coupon.selling_price_paise || coupon.face_value_paise || 0;

        if (totalOutstanding + purchaseAmountPaise > settings.max_credit_limit_paise) {
            const limitRupees = (settings.max_credit_limit_paise / 100).toFixed(2);
            const outstandingRupees = (totalOutstanding / 100).toFixed(2);
            return NextResponse.json({
                error: `Credit limit exceeded. This merchant allows up to ₹${limitRupees} in outstanding deferred payments. You currently have ₹${outstandingRupees} outstanding.`
            }, { status: 400 });
        }

        // 8. Check for duplicate pending request on same coupon
        const { data: existingRequest } = await supabaseAdmin
            .from('udhari_requests')
            .select('id')
            .eq('customer_id', user.id)
            .eq('coupon_id', couponId)
            .in('status', ['pending', 'approved'])
            .maybeSingle();

        if (existingRequest) {
            return NextResponse.json({ error: 'You already have an active deferred payment request for this gift card' }, { status: 409 });
        }

        // 9. Create udhari request
        const { data: udhariRequest, error: insertError } = await supabaseAdmin
            .from('udhari_requests')
            .insert({
                customer_id: user.id,
                merchant_id: coupon.merchant_id,
                coupon_id: couponId,
                amount_paise: purchaseAmountPaise,
                duration_days: Math.min(durationDays || settings.max_duration_days, settings.max_duration_days),
                customer_note: customerNote || null,
                status: 'pending',
            })
            .select('id')
            .single();

        if (insertError || !udhariRequest) {
            console.error(JSON.stringify({ correlationId, stage: 'udhari_insert', error: insertError }));
            return NextResponse.json({ error: 'Failed to create deferred payment request' }, { status: 500 });
        }

        // 10. Notify merchant
        const { error: notifError } = await supabaseAdmin.from('notifications').insert({
            user_id: coupon.merchant.user_id,
            title: 'New Store Credit Request',
            body: `A customer has requested deferred payment of ₹${(purchaseAmountPaise / 100).toFixed(2)} for "${coupon.title || coupon.brand}". Review it in your Udhari dashboard.`,
            type: 'info',
            reference_id: udhariRequest.id,
            reference_type: 'udhari_request',
        });

        if (notifError) {
            console.error(JSON.stringify({ correlationId, stage: 'notification_insert', error: notifError }));
            // Non-critical — don't fail the request
        }

        return NextResponse.json({
            success: true,
            message: 'Deferred payment request submitted successfully. The merchant will review your request.',
            requestId: udhariRequest.id,
        });

    } catch (error) {
        console.error(JSON.stringify({ correlationId, stage: 'unexpected_error', error: error?.message || String(error) }));
        return NextResponse.json({ error: 'An unexpected internal error occurred.', correlationId }, { status: 500 });
    }
}
