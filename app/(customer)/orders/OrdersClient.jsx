"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { 
  Package, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle2, 
  ShoppingBag,
  ExternalLink,
  Store,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const OrdersClient = ({ userId }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
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
            shopping_products (title, image_url),
            merchants (business_name)
          )
        `)
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGroups(data || []);
      if (isSuccess && data?.length > 0) {
        setExpandedGroupId(data[0].id);
      }
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
        <ShoppingBag className="w-16 h-16 text-gray-700 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-gray-400">No orders yet</h3>
        <p className="text-gray-500 mt-2 mb-8">Start your shopping journey with InTrust Merchants.</p>
        <Link href="/shop" className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all font-bold">
          Explore Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 mb-8 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center gap-4 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
            <div>
              <h3 className="text-xl font-bold">Order Placed Successfully!</h3>
              <p className="text-sm opacity-80">Your items are being processed by the merchants.</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <div 
            key={group.id} 
            className={`border rounded-3xl transition-all overflow-hidden ${
              expandedGroupId === group.id 
                ? "bg-white/5 border-white/20 shadow-2xl" 
                : "bg-white/[0.02] border-white/10 hover:border-white/20"
            }`}
          >
            <button 
              onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
              className="w-full text-left p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className={`p-3 rounded-2xl transition-colors ${expandedGroupId === group.id ? "bg-emerald-500 text-white" : "bg-white/5 text-gray-400"}`}>
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">Order #{group.id.slice(0, 8)}</span>
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-black px-2 py-0.5 rounded-md">
                      {group.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {format(new Date(group.created_at), "PPP")} • {group.shopping_order_items?.length} items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Total</p>
                  <p className="text-xl font-black">₹{(group.total_amount_paise / 100).toLocaleString()}</p>
                </div>
                {expandedGroupId === group.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {expandedGroupId === group.id && (
              <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-4 duration-300">
                <div className="h-px bg-white/10 mb-6" />
                <div className="space-y-4">
                  {group.shopping_order_items?.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group/item">
                      <div className="w-16 h-16 bg-white/10 rounded-xl overflow-hidden flex-shrink-0">
                        {item.shopping_products?.image_url ? (
                          <img src={item.shopping_products.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="text-gray-700" /></div>
                        )}
                      </div>
                      <div className="flex-grow flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-gray-200 group-hover/item:text-emerald-400 transition-colors uppercase tracking-tight">
                            {item.shopping_products?.title}
                          </h5>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            Sold by {item.merchants?.business_name || "Merchant"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black">₹{(item.unit_price_paise * item.quantity / 100).toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500 mt-1">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/5">
                   <div className="text-center sm:text-left">
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Payment Method</p>
                     <p className="text-sm font-bold text-gray-300">InTrust Wallet (Internal)</p>
                   </div>
                   <Link 
                     href="/transactions" 
                     className="flex items-center gap-2 text-emerald-400 text-sm font-bold hover:underline"
                   >
                     View Transaction Details <ExternalLink className="w-4 h-4" />
                   </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersClient;
