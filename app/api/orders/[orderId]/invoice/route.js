import { createServerSupabaseClient, createAdminClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { isValidUUID } from "@/lib/utils";
import { getPlatformConfig } from "@/lib/config/platform-server";
import { 
    isOrderInvoiceEligible, 
    getInvoiceIneligibilityReason, 
    getOrderInvoiceNumber 
} from "@/lib/orders/invoiceEligibility";

export async function GET(request, { params }) {
    try {
        const { orderId } = await params;
        if (!isValidUUID(orderId)) {
            return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Use admin client to load order securely across RLS boundaries
        const adminSupabase = createAdminClient();

        // 1. Fetch Order with items, products, and merchant info
        const { data: order, error: orderError } = await adminSupabase
            .from("shopping_order_groups")
            .select(`
                *,
                shopping_order_items (
                    *,
                    shopping_products (
                        title, 
                        hsn_code, 
                        gst_percentage, 
                        mrp_paise, 
                        suggested_retail_price_paise
                    ),
                    merchants (
                        id,
                        user_id,
                        business_name, 
                        business_address, 
                        business_phone, 
                        gst_number
                    )
                )
            `)
            .eq("id", orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Enrich gateway transaction ref if missing
        if (!order.client_txn_id && order.payment_method === 'gateway') {
            const { data: txn } = await adminSupabase
                .from('transactions')
                .select('client_txn_id, payment_mode')
                .eq('udf2', order.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (txn?.client_txn_id) {
                order.client_txn_id = txn.client_txn_id;
                if (txn.payment_mode) order.payment_mode = txn.payment_mode;
            }
        }

        // 2. Fetch User Profile to check for admin role
        const { data: profile } = await adminSupabase
            .from("user_profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
        const isCustomer = order.customer_id === user.id;

        // Check if user is the assigned merchant
        let isMerchant = false;
        if (order.merchant_id) {
            const { data: merchantRecord } = await adminSupabase
                .from("merchants")
                .select("id")
                .eq("id", order.merchant_id)
                .eq("user_id", user.id)
                .maybeSingle();
            if (merchantRecord) {
                isMerchant = true;
            }
        }

        // Authorization check
        if (!isAdmin && !isCustomer && !isMerchant) {
            return NextResponse.json({ error: "Access denied." }, { status: 403 });
        }

        // 3. Invoice Eligibility Enforcement (Customer & Merchant)
        // Internal admins are granted access for operational/accounting audits.
        const isEligible = isOrderInvoiceEligible(order);
        if (!isAdmin && !isEligible) {
            const ineligibilityReason = getInvoiceIneligibilityReason(order);
            return NextResponse.json(
                {
                    error: "Invoice is not available until the order reaches the required fulfillment stage.",
                    reason: ineligibilityReason,
                    eligible: false,
                    order_status: order.status,
                    delivery_status: order.delivery_status,
                    payment_status: order.payment_status
                },
                { status: 403 }
            );
        }

        // 4. Resolve Seller Details
        let sellerDetails = null;
        if (order.is_platform_order) {
            const platformConfig = await getPlatformConfig();
            sellerDetails = platformConfig.business;
        } else {
            const merchant = order.shopping_order_items?.[0]?.merchants;
            if (merchant) {
                sellerDetails = {
                    name: merchant.business_name || "Merchant",
                    address: merchant.business_address || "Address not provided",
                    phone: merchant.business_phone || "",
                    gstin: merchant.gst_number || "Unregistered",
                };
            }
        }

        const invoiceNumber = getOrderInvoiceNumber(order);

        return NextResponse.json({
            success: true,
            eligible: true,
            invoice_number: invoiceNumber,
            order,
            items: order.shopping_order_items || [],
            seller_details: sellerDetails,
            is_admin_access: isAdmin && !isEligible
        });

    } catch (err) {
        console.error("[API] Order Invoice Error:", err);
        return NextResponse.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}
