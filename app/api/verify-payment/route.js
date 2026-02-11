import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import { createRequestLogger } from "@/lib/logger";

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
    const logger = createRequestLogger('verify-payment');

    try {
        logger.info('Verification request received');

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = await request.json();

        logger.info('Verifying signature', { orderId: razorpay_order_id, paymentId: razorpay_payment_id });

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            logger.error('Invalid signature');
            return NextResponse.json(
                { message: "Invalid signature", success: false },
                { status: 400 }
            );
        }

        logger.info('Signature verified');

        const supabaseAdmin = createAdminClient();

        // 1️⃣ Fetch order
        const { data: order, error } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("razorpay_order_id", razorpay_order_id)
            .single();

        if (error || !order) {
            logger.error('Order not found', { error });
            return NextResponse.json(
                { message: "Order not found", success: false },
                { status: 404 }
            );
        }

        logger.info('Order found', { internalOrderId: order.id });

        // 2️⃣ Call atomic RPC
        const { data: rpcResult, error: rpcError } =
            await supabaseAdmin.rpc("finalize_coupon_purchase", {
                p_order_id: order.id,
                p_payment_id: razorpay_payment_id,
            });

        if (rpcError) {
            logger.error('RPC error', rpcError);
            return NextResponse.json(
                { message: "Order finalization failed", success: false },
                { status: 500 }
            );
        }

        logger.info('Payment verified and order fulfilled');

        return NextResponse.json({
            message: "Payment verified and order fulfilled",
            success: true,
        });

    } catch (err) {
        logger.error('Verify error', err);
        return NextResponse.json(
            { message: "Internal server error", success: false },
            { status: 500 }
        );
    }
}
