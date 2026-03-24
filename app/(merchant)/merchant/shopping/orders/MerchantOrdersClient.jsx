"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { 
  Package, 
  Search, 
  Filter, 
  ChevronRight, 
  MapPin, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  User,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";

const MerchantOrdersClient = ({ merchantId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("shopping_order_items")
        .select(`
          *,
          shopping_products (title, image_url),
          shopping_order_groups (customer_id, status)
        `)
        .eq("seller_id", merchantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching merchant orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel("merchant_orders_realtime")
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "shopping_order_items",
          filter: `seller_id=eq.${merchantId}`
        },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [merchantId]);

  const filteredOrders = orders.filter(item => {
    const matchesSearch = item.shopping_products?.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    totalSales: orders.reduce((acc, curr) => acc + (curr.unit_price_paise * curr.quantity), 0),
    totalProfit: orders.reduce((acc, curr) => acc + curr.profit_paise, 0),
    count: orders.length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium">Lifetime Revenue</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold">₹{(stats.totalSales / 100).toLocaleString()}</h3>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium">Net Profit</span>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-blue-400">₹{(stats.totalProfit / 100).toLocaleString()}</h3>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium">Total Orders</span>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Package className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-purple-400">{stats.count}</h3>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {["all", "pending", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all whitespace-nowrap ${
                filter === f ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "hover:bg-white/10 text-gray-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400">No orders found</h3>
            <p className="text-gray-500 mt-2">New orders will appear here automatically.</p>
          </div>
        ) : (
          filteredOrders.map((item) => (
            <div 
              key={item.id}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-6 hover:border-white/20 transition-all group"
            >
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-20 h-20 bg-white/10 rounded-xl overflow-hidden flex-shrink-0">
                  {item.shopping_products?.image_url ? (
                    <img src={item.shopping_products.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                </div>
                
                <div className="flex-grow space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg text-white group-hover:text-emerald-400 transition-colors">
                        {item.shopping_products?.title}
                      </h4>
                      <p className="text-gray-400 text-sm flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {format(new Date(item.created_at), "MMM d, yyyy • hh:mm a")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{(item.unit_price_paise * item.quantity / 100).toLocaleString()}</p>
                      <p className="text-blue-400 text-sm font-medium">Profit: ₹{(item.profit_paise / 100).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      {item.shopping_order_groups?.status || "delivered"}
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 text-gray-400 px-3 py-1 rounded-full text-xs">
                      <User className="w-3 h-3" />
                      Customer: {item.shopping_order_groups?.customer_id.slice(0, 8)}...
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 text-gray-400 px-3 py-1 rounded-full text-xs">
                      Qty: {item.quantity}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MerchantOrdersClient;
