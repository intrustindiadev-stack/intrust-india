import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { giftcardId } = body;

    console.log("🔹 [API] Create Order Request Received");
    console.log("🔹 [API] Payload:", body);

    if (!giftcardId) {
      console.error("❌ [API] Missing giftcardId in request body");
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
      console.error("❌ [API] Unauthorized access attempt", authError);
      return NextResponse.json(
        { error: 'Unauthorized: Please login to purchase' },
        { status: 401 }
      );
    }
    console.log("🔹 [API] User authenticated:", user.id);

    // 0. KYC Check (CRITICAL)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('kyc_status')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("❌ [API] Failed to fetch user profile for KYC check", profileError);
      return NextResponse.json(
        { error: 'Failed to verify KYC status' },
        { status: 500 }
      );
    }

    if (userProfile.kyc_status !== 'approved' && userProfile.kyc_status !== 'verified') {
      console.warn(`⚠️ [API] KYC not approved. Status: ${userProfile.kyc_status}`);
      return NextResponse.json(
        { error: 'KYC_REQUIRED', message: 'You must complete KYC to purchase gift cards.' },
        { status: 403 }
      );
    }

    console.log("✅ [API] KYC Verified: approved");

    // 1. Fetch Coupon (Using 'coupons' table)
    console.log(`🔹 [API] Fetching coupon with ID: ${giftcardId}...`);

    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', giftcardId)
      .single();

    if (couponError) {
      console.error("❌ [API] Database Error fetching coupon:", couponError);
      return NextResponse.json({ error: 'Database error fetching coupon' }, { status: 500 });
    }

    if (!coupon) {
      console.error(`❌ [API] Coupon not found for ID: ${giftcardId}`);
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    console.log("✅ [API] Coupon found:", {
      id: coupon.id,
      status: coupon.status,
      price: coupon.selling_price_paise
    });

    // 2. Check Availability
    if (coupon.status !== 'available') {
      console.warn(`⚠️ [API] Coupon unavailable. Status: ${coupon.status}`);
      return NextResponse.json(
        { error: 'This gift card is no longer available' },
        { status: 400 }
      );
    }

    // 3. Initialize Razorpay
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const amountPaise = coupon.selling_price_paise;

    console.log(`🔹 [API] Creating Razorpay order for amount: ${amountPaise} paise`);

    // 4. Create Razorpay Order
    const razorpayOrder = await instance.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now().toString().slice(-10)}`,
      notes: {
        coupon_id: coupon.id,
        user_id: user.id
      }
    });

    console.log("✅ [API] Razorpay Order created:", razorpayOrder.id);

    // 5. Insert into Orders Table
    // NOTE: Using 'orders' table as per prompt requirements.
    // Mapping giftcard_id -> coupon.id
    const orderPayload = {
      user_id: user.id,
      giftcard_id: coupon.id,
      amount: amountPaise,
      payment_status: 'created',
      razorpay_order_id: razorpayOrder.id
    };

    console.log("🔹 [API] Inserting into orders table:", orderPayload);

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) {
      console.error("❌ [API] Order Insertion Failed:", orderError);
      return NextResponse.json(
        { error: 'Failed to create internal order record', details: orderError.message },
        { status: 500 }
      );
    }

    console.log("✅ [API] Internal Order created:", orderData.id);

    return NextResponse.json({
      id: razorpayOrder.id, // Standard Razorpay response expected by frontend
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      order_id: orderData.id // Our internal ID
    });

  } catch (error) {
    console.error('❌ [API] Critical Error in Create Order:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
