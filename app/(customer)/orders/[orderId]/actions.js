"use server";

import { createServerSupabaseClient, createAdminClient } from "@/lib/supabaseServer";
import { CustomerWalletService } from "@/lib/wallet/customerWalletService";

export async function cancelOrderAction(orderId) {
    try {
        // Use cookie-based client ONLY to identify the authenticated user
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, message: "Unauthorized" };
        }

        // Use admin client for all DB operations to bypass RLS update restrictions
        const adminClient = createAdminClient();

        // 1. Fetch order and verify ownership + cancellability
        const { data: order, error: fetchError } = await adminClient
            .from("shopping_order_groups")
            .select("id, customer_id, delivery_status, status, payment_method, total_amount_paise")
            .eq("id", orderId)
            .eq("customer_id", user.id) // ownership check
            .single();

        if (fetchError || !order) {
            console.error("[cancelOrder] Fetch error:", fetchError);
            return { success: false, message: "Order not found" };
        }

        // Block if already shipped or delivered
        if (['shipped', 'delivered'].includes(order.delivery_status)) {
            return { success: false, message: `Order cannot be cancelled as it has already been ${order.delivery_status}.` };
        }
        if (order.status === 'failed' || order.status === 'cancelled') {
            return { success: false, message: "This order has already been cancelled." };
        }
        // Wallet refund on cancellation is intentionally disabled.

        // 2. Update order status atomically via admin client
        const { error: updateError } = await adminClient
            .from("shopping_order_groups")
            .update({
                delivery_status: 'cancelled',
                status: 'failed'
            })
            .eq("id", orderId)
            .eq("customer_id", user.id); // double-check ownership in WHERE clause

        if (updateError) {
            console.error("[cancelOrder] Failed to update order status:", updateError);
            return { success: false, message: "Failed to cancel order. Please try again." };
        }

        if (order.payment_method === 'store_credit') {
            const { error: udhariError } = await adminClient
                .from("udhari_requests")
                .update({ status: 'cancelled' })
                .eq("shopping_order_group_id", orderId)
                .in("status", ['approved', 'completed']);

            if (udhariError) {
                console.error("[cancelOrder] Failed to cancel udhari request:", udhariError);
            }
        }

        // Wallet refund on cancellation is disabled.

        return { success: true };
    } catch (err) {
        console.error("[cancelOrder] Unexpected error:", err);
        return { success: false, message: err.message || "An unexpected error occurred" };
    }
}
