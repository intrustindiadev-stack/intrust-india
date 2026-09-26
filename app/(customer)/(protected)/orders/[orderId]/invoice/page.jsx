import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import { isValidUUID } from "@/lib/utils";
import { getPlatformConfig } from "@/lib/config/platform-server";
import { isOrderInvoiceEligible, getInvoiceIneligibilityReason } from "@/lib/orders/invoiceEligibility";
import InvoiceClient from "./InvoiceClient";
import Link from "next/link";
import { Package, Clock, ArrowLeft, ShieldAlert } from "lucide-react";

export default async function InvoicePage({ params }) {
    const { orderId } = await params;
    if (!isValidUUID(orderId)) return notFound();
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return notFound();

    // Fetch the order
    const { data: order, error } = await supabase
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
                    business_name, 
                    business_address, 
                    business_phone, 
                    gst_number
                )
            )
        `)
        .eq("id", orderId)
        .eq("customer_id", user.id)
        .single();

    if (error || !order) {
        console.error("Order not found for invoice:", error);
        return notFound();
    }

    // Enrich gateway transaction ref if missing
    if (!order.client_txn_id && order.payment_method === 'gateway') {
        const { data: txn } = await supabase
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

    // Check authoritative invoice eligibility
    const isEligible = isOrderInvoiceEligible(order);
    if (!isEligible) {
        const reason = getInvoiceIneligibilityReason(order);
        const isCancelled = order.status === "cancelled" || order.delivery_status === "cancelled";

        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 flex items-center justify-center font-sans">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-5 bg-amber-50 text-amber-600">
                        {isCancelled ? (
                            <ShieldAlert className="w-8 h-8 text-rose-500" />
                        ) : (
                            <Package className="w-8 h-8 text-amber-500" />
                        )}
                    </div>

                    <h1 className="text-xl font-black text-slate-900 mb-2">
                        {isCancelled ? "Invoice Not Available" : "Invoice Available After Packing"}
                    </h1>
                    <p className="text-xs text-slate-500 leading-relaxed mb-6">
                        {reason || "The final tax invoice will be generated and ready to download once your order has been packed and prepared for shipment."}
                    </p>

                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 text-left space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Order ID</span>
                            <span className="font-mono font-bold text-slate-700">#{order.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Payment Status</span>
                            <span className={`font-bold uppercase tracking-wider text-[11px] ${order.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                                {order.payment_status || "Pending"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Fulfillment Status</span>
                            <span className="font-bold uppercase tracking-wider text-[11px] text-blue-600">
                                {order.delivery_status || "Pending"}
                            </span>
                        </div>
                    </div>

                    <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Return to Order Details</span>
                    </Link>
                </div>
            </div>
        );
    }

    // Determine the seller details
    let sellerDetails = null;
    if (order.is_platform_order) {
        // Platform products - Dynamic details from database
        const platformConfig = await getPlatformConfig();
        sellerDetails = platformConfig.business;
    } else {
        // Merchant Products
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

    return (
        <InvoiceClient 
            order={order} 
            items={order.shopping_order_items || []} 
            sellerDetails={sellerDetails} 
        />
    );
}
