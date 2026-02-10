import crypto from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";

export async function POST(request) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = await request.json();

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return NextResponse.json(
                { message: "Invalid signature", success: false },
                { status: 400 }
            );
        }

        const supabaseAdmin = createAdminClient();

        // 1️⃣ Fetch order
        const { data: order, error } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("razorpay_order_id", razorpay_order_id)
            .single();

        if (error || !order) {
            return NextResponse.json(
                { message: "Order not found", success: false },
                { status: 404 }
            );
        }

        // 2️⃣ Call atomic RPC
        const { data: rpcResult, error: rpcError } =
            await supabaseAdmin.rpc("finalize_coupon_purchase", {
                p_order_id: order.id,
                p_payment_id: razorpay_payment_id,
            });

        if (rpcError) {
            console.error("RPC error:", rpcError);
            return NextResponse.json(
                { message: "Order finalization failed", success: false },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: "Payment verified and order fulfilled",
            success: true,
        });

    } catch (err) {
        console.error("Verify error:", err);
        return NextResponse.json(
            { message: "Internal server error", success: false },
            { status: 500 }
        );
    }
}
