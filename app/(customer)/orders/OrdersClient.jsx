"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  Package,
  ChevronRight,
  CheckCircle2,
  ShoppingBag,
  ExternalLink,
  Store,
  ArrowRight,
  Clock,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const OrdersClient = ({ userId }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const supabase = createClient();

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("shopping_order_groups")
        .select(`
          *,
          shopping_order_items (
            *,
            shopping_products (title, image_url, mrp_paise, suggested_retail_price_paise),
            merchants (business_name)
          )
        `)
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (err) {
      console.error("Error fetching customer orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-gray-500">Loading your orders...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">No orders found</h3>
        <p className="text-gray-500 mb-6 text-sm">Looks like you haven't made any purchases yet.</p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-green-800 font-bold">Order Placed Successfully</h3>
            <p className="text-green-700 text-sm mt-1">Your items are being processed. Thank you for shopping with us!</p>
          </div>
        </div>
      )}

      {groups.map((group) => {
        const itemCount = group.shopping_order_items?.length || 0;

        return (
          <div
            key={group.id}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          >
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-500">Order ID:</span>
                    <span className="font-semibold text-gray-800 uppercase">{group.id.slice(0, 8)}</span>
                    <span className={`ml-2 inline-block px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                      group.delivery_status === 'delivered' ? 'bg-green-100 text-green-800' :
                      group.delivery_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      group.delivery_status === 'packed' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {group.delivery_status || 'pending'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {format(new Date(group.created_at), "dd MMM yyyy, h:mm a")}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {group.delivery_address ? (group.delivery_address.slice(0, 30) + (group.delivery_address.length > 30 ? '...' : '')) : 'No address'}</span>
                    <span>{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                  <p className="text-xs text-gray-500 mb-0.5">Order Total</p>
                  <p className="text-lg font-black text-gray-900">₹{(group.total_amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  {group.shopping_order_items?.some(item => (item.shopping_products?.suggested_retail_price_paise || 0) > item.unit_price_paise) && (
                    <div className="mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded border border-emerald-100 italic">
                      You saved ₹{((group.shopping_order_items.reduce((acc, item) => {
                        const mrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || item.unit_price_paise;
                        return acc + (Math.max(0, mrp - item.unit_price_paise) * item.quantity);
                      }, 0)) / 100).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-gray-100">
              {group.shopping_order_items?.map((item) => (
                <div key={item.id} className="p-4 flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-md border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.shopping_products?.image_url ? (
                      <img
                        src={item.shopping_products.image_url}
                        alt={item.shopping_products.title}
                        className="w-full h-full object-contain p-1 mix-blend-multiply"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-gray-300" />
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm sm:text-base leading-snug line-clamp-2">
                        {item.shopping_products?.title}
                      </h4>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <Store className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <span>Sold by {item.merchants?.business_name || "InTrust Official"}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-end justify-between">
                      <div className="font-bold text-gray-900">
                        ₹{((item.unit_price_paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">
                        Qty: {item.quantity}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="text-sm">
                  <span className="text-gray-500">Paid via: </span>
                  <span className="font-semibold text-gray-700">InTrust Wallet</span>
                </div>

                <Link
                  href={`/orders/${group.id}`}
                  className="w-full sm:w-auto text-center px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded transition-colors"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrdersClient;
