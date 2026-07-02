"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  MapPin,
  X,
  CreditCard,
  Zap,
  Ticket
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ScratchCard from "@/components/ui/ScratchCard";
import { useRewardsRealtime } from "@/lib/contexts/RewardsRealtimeContext";
import { useTheme } from "@/lib/contexts/ThemeContext";

const OrdersClient = ({ userId }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const primaryColor = '#2563EB';
  const secondaryColor = '#3B82F6';

  // ── Rewards Context Consumption (Step 3) ───────────────────────────────────
  let unscratchedCards = [], lastArrival = null, markScratched = () => {};
  try {
    const ctx = useRewardsRealtime();
    ({ unscratchedCards, lastArrival, markScratched } = ctx);
  } catch { /* outside provider — no popup */ }

  // ── State and Refs (Step 4) ────────────────────────────────────────────────
  const [selectedCard, setSelectedCard] = useState(null);
  const [revealedCardIds, setRevealedCardIds] = useState(new Set());
  const [isProcessingReveal, setIsProcessingReveal] = useState(false);
  const hasAutoOpenedRef = useRef(false);

  // ── Modal Helpers (Step 7/8) ────────────────────────────────────────────────
  const closeModal = useCallback(() => {
    setSelectedCard(null);
    router.replace(pathname);
  }, [pathname, router]);

  // ── Auto-open Effects (Step 5) ─────────────────────────────────────────────
  // Effect A — hydration path
  useEffect(() => {
    if (isSuccess && !hasAutoOpenedRef.current && unscratchedCards.length > 0) {
      setSelectedCard(unscratchedCards[0]);
      hasAutoOpenedRef.current = true;
      toast.success("🎁 You've earned a new reward! Scratch to reveal.", { duration: 4000 });
    }
  }, [isSuccess, unscratchedCards]);

  // Effect B — realtime arrival path
  useEffect(() => {
    if (lastArrival && isSuccess && !hasAutoOpenedRef.current) {
      setSelectedCard(lastArrival);
      hasAutoOpenedRef.current = true;
      toast.success("🎁 You've earned a new reward! Scratch to reveal.", { duration: 4000 });
    }
  }, [lastArrival, isSuccess]);

  // ── handleScratchComplete Callback (Step 6) ────────────────────────────────
  const handleScratchComplete = useCallback(async (cardId) => {
    if (isProcessingReveal) return;
    setIsProcessingReveal(true);

    try {
      const res = await fetch(`/api/rewards/scratch/${cardId}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok && data.code !== 'already_scratched') {
        throw new Error(data.code || 'Failed to claim reward');
      }

      setRevealedCardIds(prev => new Set(prev).add(cardId));
      if (data.pointsWon > 0) {
        toast.success(`🎉 Won ${data.pointsWon} Points!`);
      }

      setTimeout(() => {
        markScratched(cardId);
        setRevealedCardIds(prev => {
          const s = new Set(prev);
          s.delete(cardId);
          return s;
        });
        closeModal();
        setIsProcessingReveal(false);
      }, 2500);

    } catch (err) {
      toast.error(err.message || 'Failed to claim reward. Please try again.');
      setIsProcessingReveal(false);
    }
  }, [isProcessingReveal, markScratched, closeModal]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("shopping_order_groups")
        .select(`
          *,
          shopping_order_items (
            *,
            shopping_products (title, product_images, mrp_paise, suggested_retail_price_paise, category),
            merchants (business_name)
          )
        `)
        .eq("customer_id", userId)
        .in("status", ["completed", "pending"])
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
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-white/10 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin"></div>
        <p className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Loading your orders...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className={`text-center py-20 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border mt-4 ${isDark ? 'bg-[#0c0e16] border-white/[0.04]' : 'bg-white border-slate-100'}`}>
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-blue-600/10 text-blue-500' : 'bg-blue-50 text-blue-600'}`}>
          <ShoppingBag size={40} />
        </div>
        <h3 className={`text-2xl font-black mb-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>No orders found</h3>
        <p className={`text-sm mb-8 max-w-xs mx-auto ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Looks like you haven't made any purchases yet. Discover amazing deals today!</p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-full transition-colors uppercase tracking-widest text-sm shadow-lg shadow-blue-600/30"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {isSuccess && (
        <div className={`rounded-2xl p-5 flex items-start gap-4 shadow-sm border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
             <CheckCircle2 size={20} className="text-white" />
          </div>
          <div>
            <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>Order Placed Successfully!</h3>
            <p className={`text-sm font-medium mt-1 ${isDark ? 'text-emerald-500/70' : 'text-emerald-700'}`}>Your items are being processed. Thank you for shopping with us!</p>
          </div>
        </div>
      )}

      {/* Visual Hero Header */}
      <div className={`p-8 rounded-[2rem] sm:rounded-[3rem] relative overflow-hidden flex items-center justify-between shadow-2xl ${isDark ? 'bg-gradient-to-br from-blue-900 to-black border border-blue-500/20' : 'bg-gradient-to-br from-blue-600 to-blue-400'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10 text-white">
          <h1 className="text-3xl sm:text-5xl font-black mb-2 tracking-tighter">My Orders</h1>
          <p className="text-sm font-medium opacity-80 max-w-sm">Track your recent purchases, view details, and scratch cards for rewards.</p>
        </div>
        <div className="hidden sm:flex relative z-10 w-20 h-20 bg-white/20 rounded-full items-center justify-center backdrop-blur-md shadow-inner border border-white/30">
          <Package size={40} className="text-white" />
        </div>
      </div>

      <div className="space-y-5">
        {groups.map((group) => {
          const itemCount = group.shopping_order_items?.length || 0;

          return (
            <div
              key={group.id}
              className={`relative overflow-hidden rounded-[2rem] border shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all ${
                  isDark ? 'bg-[#0c0e16] border-white/[0.04]' : 'bg-white border-slate-100'
              }`}
            >
              {/* Header */}
              <div className={`p-5 sm:p-6 border-b ${isDark ? 'border-white/[0.04] bg-white/[0.01]' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                        group.delivery_status === 'delivered' ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800') :
                        group.delivery_status === 'shipped' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-800') :
                        group.delivery_status === 'packed' ? (isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-800') :
                        (isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800')
                      }`}>
                        {group.delivery_status || 'Pending'}
                      </span>
                      <span className={`text-xs font-bold uppercase tracking-wider opacity-60 ${isDark ? 'text-white' : 'text-slate-500'}`}>
                        Order #{group.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className={`flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                      <span className="flex items-center gap-1.5"><Clock size={14} /> {format(new Date(group.created_at), "dd MMM yyyy, h:mm a")}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={14} /> {group.delivery_address ? (group.delivery_address.slice(0, 30) + (group.delivery_address.length > 30 ? '...' : '')) : 'No address'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end">
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Order Total</p>
                    <p className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        ₹{(group.total_amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </p>
                    {group.shopping_order_items?.some(item => (item.shopping_products?.suggested_retail_price_paise || 0) > item.unit_price_paise) && (
                      <div className={`mt-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                          isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        You saved ₹{((group.shopping_order_items.reduce((acc, item) => {
                          const mrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || item.unit_price_paise;
                          return acc + (Math.max(0, mrp - item.unit_price_paise) * item.quantity);
                        }, 0)) / 100).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual Order Status Tracker */}
                <div className={`mt-5 pt-5 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  {(() => {
                    const statuses = ['pending', 'packed', 'shipped', 'delivered'];
                    const currentStatusIdx = Math.max(0, statuses.indexOf(group.delivery_status || 'pending'));
                    return (
                      <div className="flex items-center justify-between relative px-2 sm:px-6">
                        <div className="absolute top-3 left-6 right-6 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                            style={{ width: `${(currentStatusIdx / (statuses.length - 1)) * 100}%` }}
                          />
                        </div>
                        {statuses.map((status, idx) => {
                          const isCompleted = idx <= currentStatusIdx;
                          const isCurrent = idx === currentStatusIdx;
                          return (
                            <div key={status} className="relative z-10 flex flex-col items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors duration-500 ${
                                isCompleted 
                                  ? 'bg-blue-500 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]' 
                                  : 'bg-slate-100 dark:bg-[#0c0e16] border-slate-300 dark:border-slate-700 text-slate-400'
                              }`}>
                                {isCompleted ? <CheckCircle2 size={12} /> : idx + 1}
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider hidden sm:block ${
                                isCurrent ? 'text-blue-600 dark:text-blue-400' : 
                                isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
                              }`}>
                                {status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Items List */}
              <div className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-slate-100'}`}>
                {group.shopping_order_items?.map((item) => (
                  <div key={item.id} className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-5 group-hover:bg-slate-50/50 transition-colors">
                    {/* Thumbnail */}
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden relative ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                      {item.shopping_products?.product_images?.[0] ? (
                        <Image
                          src={item.shopping_products.product_images[0]}
                          alt={item.shopping_products.title}
                          fill
                          sizes="100px"
                          className="object-contain p-2 mix-blend-multiply dark:mix-blend-normal"
                          quality={60}
                        />
                      ) : (
                        <Package size={32} className={isDark ? 'text-white/10' : 'text-slate-300'} />
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h4 className={`font-black text-sm sm:text-base leading-snug line-clamp-2 mb-1 tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {item.shopping_products?.title}
                        </h4>
                        <div className={`text-[10px] sm:text-xs font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                             {item.shopping_products?.category || 'Category'}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: primaryColor }}>
                          <Store size={14} />
                          <span>{item.merchants?.business_name || "InTrust Official"}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-end justify-between">
                        <div className={`font-black text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          ₹{((item.unit_price_paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </div>
                        <div className={`text-xs font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          Qty: {item.quantity}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className={`p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 ${isDark ? 'bg-white/[0.01] border-t border-white/[0.04]' : 'bg-slate-50 border-t border-slate-100'}`}>
                <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                  <CreditCard size={14} />
                  <span>
                    {group.payment_method === 'gateway' ? "Online Payment (SabPaisa)" :
                      group.payment_method === 'cod' ? "Cash on Delivery" :
                        group.payment_method === 'store_credit' ? "Store Credit (Udhari)" :
                          "InTrust Wallet"}
                  </span>
                </div>

                <Link
                  href={`/orders/${group.id}`}
                  className="w-full sm:w-auto text-center px-6 py-2.5 bg-transparent border hover:bg-slate-50 dark:hover:bg-white/5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  View Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Premium Reward Scratch Modal (Step 7) */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, rotateX: 20 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.8, y: 50, rotateX: 20 }}
              className="relative w-full max-w-md bg-gradient-to-b from-[#0F172A] to-black rounded-[3rem] p-1 shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="relative bg-black/40 rounded-[2.9rem] p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

                <button
                  onClick={() => !isProcessingReveal && closeModal()}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors border border-white/10 z-20 disabled:opacity-50"
                  disabled={isProcessingReveal}
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-10 relative z-10 pt-4">
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tighter italic">Empire Loot Box</h3>
                  <p className="text-emerald-400 font-bold uppercase tracking-[0.3em] text-[10px]">Scratch to Reveal Prize</p>
                </div>

                <div className="relative h-72 sm:h-80 w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl ring-4 ring-emerald-500/5">
                  <ScratchCard
                    id={selectedCard.id}
                    prizePoints={selectedCard.prize}
                    onComplete={() => handleScratchComplete(selectedCard.id)}
                    revealed={revealedCardIds.has(selectedCard.id)}
                  />
                </div>

                <div className="mt-10 text-center relative z-10">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-6 italic">Verified Rewards System</p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <p className="text-emerald-400 text-sm font-black uppercase tracking-widest">Live Settlement</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrdersClient;
