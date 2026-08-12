"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  Package,
  ChevronRight,
  ShoppingBag,
  Store,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { motion } from "framer-motion";

export default function RecentShoppingOrders({ userId, limit = 3 }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!userId) return;

    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("shopping_order_groups")
          .select(`
            id,
            total_amount_paise,
            status,
            created_at,
            shopping_order_items (
              id,
              quantity,
              unit_price_paise,
              shopping_products (title, product_images, mrp_paise, suggested_retail_price_paise),
              merchants (business_name)
            ),
            delivery_status
          `)
          .eq("customer_id", userId)
          .in("status", ["completed", "pending"]) // show paid or store credit (pending) orders
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error("Error fetching recent shopping orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId, limit]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm animate-pulse">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden transition-all duration-500">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
                <Link
                    href="/orders"
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                    View All <ChevronRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="p-6">
                {orders.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5">
                        <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 bg-gray-100 dark:bg-gray-800">
                            <ShoppingBag className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">No recent purchases</p>
                        <p className="text-[11px] mt-1 text-gray-500">You haven't bought anything yet.</p>
                        <Link href="/shop" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all uppercase tracking-wider shadow-sm">
                            Start Shopping <ChevronRight size={12} />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => {
                            const firstItem = order.shopping_order_items?.[0];
                            const itemImage = firstItem?.shopping_products?.product_images?.[0];
                            const remainingItems = (order.shopping_order_items?.length || 1) - 1;
                            const totalSavedPaise = order.shopping_order_items?.reduce((acc, item) => {
                                const mrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || item.unit_price_paise;
                                return acc + (Math.max(0, mrp - item.unit_price_paise) * item.quantity);
                            }, 0) || 0;

                            return (
                                <Link key={order.id} href={`/orders/${order.id}`}>
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="group flex items-center justify-between p-4 rounded-xl border bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden shrink-0 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-white/5">
                                                {itemImage ? (
                                                    <div className="relative w-full h-full">
                                                        <Image src={itemImage} alt="" fill sizes="48px" className="object-cover mix-blend-multiply dark:mix-blend-normal" />
                                                    </div>
                                                ) : (
                                                    <Package className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-blue-500 transition-colors text-gray-900 dark:text-white">
                                                    {firstItem?.shopping_products?.title || 'Unknown Item'}
                                                    {remainingItems > 0 && <span className="ml-1 text-[11px] font-medium text-gray-400">+{remainingItems}</span>}
                                                </h4>
                                                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                                    <Store size={10} strokeWidth={2.5} />
                                                    {firstItem?.merchants?.business_name || 'InTrust Official'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="font-black tracking-tight text-gray-900 dark:text-white">
                                                ₹{(order.total_amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                            <p className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full mt-1 inline-block ${order.delivery_status === 'delivered' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                                    order.delivery_status === 'shipped' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                                        order.delivery_status === 'packed' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                                                            'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                                }`}>
                                                {order.delivery_status || 'pending'}
                                            </p>
                                            {totalSavedPaise > 0 && (
                                                <p className="text-[10px] font-black text-emerald-500 mt-1 italic">
                                                    Saved ₹{(totalSavedPaise / 100).toLocaleString('en-IN')}
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
  );
}
