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
              shopping_products (title, image_url, mrp_paise, suggested_retail_price_paise),
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
      <div className={`rounded-3xl p-6 border ${isDark ? 'bg-slate-800/10 border-slate-800' : 'bg-white border-slate-100'} animate-pulse`}>
        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
        <div className="space-y-4">
          <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl p-6 border ${isDark ? 'bg-slate-800/20 border-slate-700/50' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <ShoppingBag className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} strokeWidth={2.5} />
          Recent Purchases
        </h3>
        <Link
          href="/orders"
          className={`text-sm font-bold flex items-center hover:underline ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
        >
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <div className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
            <ShoppingBag className={`w-8 h-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
          </div>
          <p className={`text-sm font-black ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>No recent purchases</p>
          <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Looks like you haven't bought anything yet.</p>
          <Link href="/shop" className={`inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'}`}>
            Start Shopping <ChevronRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const firstItem = order.shopping_order_items?.[0];
            const itemImage = firstItem?.shopping_products?.image_url;
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
                  className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${isDark
                    ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 hover:border-emerald-500/30'
                    : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-emerald-200 shadow-sm hover:shadow-md hover:shadow-emerald-100'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${isDark ? 'bg-slate-700' : 'bg-white border border-slate-100'
                      }`}>
                      {itemImage ? (
                        <img src={itemImage} alt="" className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm sm:text-base line-clamp-1 group-hover:text-emerald-500 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-900'
                        }`}>
                        {firstItem?.shopping_products?.title || 'Unknown Item'}
                        {remainingItems > 0 && <span className={`ml-1 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>+{remainingItems} more</span>}
                      </h4>
                    <div className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      <Store size={12} strokeWidth={2.5} />
                      {firstItem?.merchants?.business_name || 'InTrust Official'}
                    </div>
                  </div>
                </div>

                  <div className="text-right">
                    <p className={`font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      ₹{(order.total_amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-[10px] uppercase font-black px-2 py-0.5 rounded mt-1 inline-block ${order.delivery_status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                      order.delivery_status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                        order.delivery_status === 'packed' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-yellow-500/20 text-yellow-400'
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
  );
}
