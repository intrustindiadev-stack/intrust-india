import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabaseServer";
import { notifyMerchantOrderCancelled } from "@/lib/notifications/merchantWhatsapp";

export async function POST(req) {
    try {
        const { orderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        // 1. Authenticate user using cookie-based client
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Fetch merchant record linked to this user
        const { data: merchant, error: mError } = await supabase
            .from("merchants")
            .select("id")
            .eq("owner_id", user.id)
            .single();

        if (mError || !merchant) {
            return NextResponse.json({ error: "Merchant record not found" }, { status: 403 });
        }

        // 3. Verify order ownership
        // We use the regular supabase client here to respect RLS
        const { data: order, error: oError } = await supabase
            .from("shopping_order_groups")
            .select("id, merchant_id, delivery_status, settlement_status")
            .eq("id", orderId)
            .single();

        if (oError || !order) {
            return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
        }

        if (order.merchant_id !== merchant.id) {
            return NextResponse.json({ error: "Unauthorized - Order does not belong to you" }, { status: 403 });
        }

        // 4. Validate eligibility
        if (order.delivery_status !== 'pending' || order.settlement_status !== 'pending') {
            return NextResponse.json({ error: "Order is not eligible for escalation (must be pending)" }, { status: 400 });
        }

        // 5. Call escalation RPC via Admin Client (bypassing RLS for ledger/wallet updates)
        const adminSupabase = createAdminClient();
        const { data, error: rpcError } = await adminSupabase.rpc("merchant_escalate_order", {
            p_order_id: orderId,
            p_merchant_id: merchant.id
        });

        if (rpcError) {
            console.error("RPC Error:", rpcError);
            return NextResponse.json({ error: rpcError.message }, { status: 500 });
        }

        if (!data?.success) {
            return NextResponse.json({ error: data?.message || "Escalation failed" }, { status: 400 });
        }

        // 6. ADDED: Notify all Admins
        const { data: adminProfiles } = await adminSupabase
            .from('user_profiles')
            .select('id')
            .eq('role', 'admin');

        if (adminProfiles && adminProfiles.length > 0) {
            const adminNotifs = adminProfiles.map((ap) => ({
                user_id: ap.id,
                title: 'Order Escalated 🚩',
                body: `A merchant has flagged Order #${orderId.slice(0, 8).toUpperCase()} as "Cannot Fulfill". Review required.`,
                type: 'error',
                reference_type: 'shopping_order',
                reference_id: orderId
            }));
            await adminSupabase.from('notifications').insert(adminNotifs);

            // Best-effort WhatsApp notification (Fire-and-forget)
            try {
                notifyMerchantOrderCancelled({
                    merchantUserId: user.id,
                    orderShortId: orderId.slice(0, 8).toUpperCase(),
                    reason: 'Cannot fulfill — escalated to admin'
                });
            } catch (e) {
                console.error('[Cannot Fulfill] WhatsApp dispatch failed:', e);
            }
        }

        return NextResponse.json({ success: true, message: data.message });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
