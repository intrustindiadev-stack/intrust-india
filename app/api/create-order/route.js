import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createRequestLogger } from '@/lib/logger';

// Force Node.js runtime (Razorpay requires Node crypto)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const logger = createRequestLogger('create-order');
  const startTime = Date.now();

  try {
    logger.info('Request received');
    const body = await request.json();
    const { giftcardId } = body;

    logger.info('Body parsed', { giftcardId });

    if (!giftcardId) {
      logger.error('Missing giftcardId');
      return NextResponse.json(
        { error: 'Gift Card ID (giftcardId) is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase Client (Auth context)
    const supabase = await createServerSupabaseClient();

    // Get User (Required for 'orders.user_id')
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error('Unauthorized access attempt', authError);
      return NextResponse.json(
        { error: 'Unauthorized: Please login to purchase' },
        { status: 401 }
      );
    }

    logger.info('User authenticated', { userId: user.id });

    // ✅ OPTIMIZATION: Fetch KYC and Coupon in parallel
    const kycStart = Date.now();
    const [
      { data: userProfile, error: profileError },
      { data: coupon, error: couponError }
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('kyc_status')
        .eq('id', user.id)
        .single(),
      supabase
        .from('coupons')
        .select('*')
        .eq('id', giftcardId)
        .single()
    ]);

    logger.info('Parallel queries complete', { elapsed: Date.now() - kycStart });

    // Check KYC Status
    if (profileError || !userProfile) {
      logger.error('Failed to fetch user profile for KYC check', profileError);
      return NextResponse.json(
        { error: 'Failed to verify KYC status' },
        { status: 500 }
      );
    }

    if (userProfile.kyc_status !== 'approved' && userProfile.kyc_status !== 'verified') {
      logger.info('KYC not approved', { status: userProfile.kyc_status });
      return NextResponse.json(
        { error: 'KYC_REQUIRED', message: 'You must complete KYC to purchase gift cards.' },
        { status: 403 }
      );
    }

    logger.info('KYC Verified', { status: userProfile.kyc_status });

    // Check Coupon
    if (couponError) {
      logger.error('Database Error fetching coupon', couponError);
      return NextResponse.json({ error: 'Database error fetching coupon' }, { status: 500 });
    }

    if (!coupon) {
      logger.error('Coupon not found', { giftcardId });
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    logger.info('Coupon found', {
      id: coupon.id,
      status: coupon.status,
      price: coupon.selling_price_paise
    });

    // Check Availability
    if (coupon.status !== 'available') {
      logger.info('Coupon unavailable', { status: coupon.status });
      return NextResponse.json(
        { error: 'This gift card is no longer available' },
        { status: 400 }
      );
    }

    // Initialize Razorpay
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const amountPaise = coupon.selling_price_paise;

    logger.info('Creating Razorpay order', { amount: amountPaise });

    // Create Razorpay Order
    const razorpayStart = Date.now();
    const razorpayOrder = await instance.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now().toString().slice(-10)}`,
      notes: {
        coupon_id: coupon.id,
        user_id: user.id
      }
    });

    logger.info('Razorpay order created', {
      elapsed: Date.now() - razorpayStart,
      orderId: razorpayOrder.id
    });

    // Insert into Orders Table
    const orderPayload = {
      user_id: user.id,
      giftcard_id: coupon.id,
      amount: amountPaise,
      payment_status: 'created',
      razorpay_order_id: razorpayOrder.id
    };

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) {
      logger.error('Order Insertion Failed', orderError);
      return NextResponse.json(
        { error: 'Failed to create internal order record', details: orderError.message },
        { status: 500 }
      );
    }

    logger.info('Order created successfully', {
      totalElapsed: Date.now() - startTime,
      orderId: orderData.id
    });

    return NextResponse.json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      order_id: orderData.id
    });

  } catch (error) {
    logger.error('Critical Error in Create Order', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
