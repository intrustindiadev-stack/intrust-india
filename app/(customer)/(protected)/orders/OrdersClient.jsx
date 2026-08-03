"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  Package, ChevronRight, CheckCircle2, ShoppingBag, ExternalLink, Store, ArrowRight, Clock, MapPin, X, CreditCard, Zap, Ticket, Download, Calendar, TrendingUp, Truck, Search
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
import CouponCodeReveal from "./CouponCodeReveal";
import { generateOrderInvoice } from "@/lib/invoiceGenerator";

const FILTER_OPTIONS = ['All', 'Shopping', 'NFC Cards', 'Gift Cards', 'Solar'];

const OrdersClient = ({ userId }) => {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const [activeFilter, setActiveFilter] = useState(filterParam || 'All');
  const [groups, setGroups] = useState([]);
  const [nfcOrders, setNfcOrders] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [solarLeads, setSolarLeads] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isSuccess = searchParams.get("success") === "true";
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const primaryColor = '#2563EB';
  const secondaryColor = '#3B82F6';

  let unscratchedCards = [], lastArrival = null, markScratched = () => {};
  try {
    const ctx = useRewardsRealtime();
    ({ unscratchedCards, lastArrival, markScratched } = ctx);
  } catch { /* outside provider — no popup */ }

  const [selectedCard, setSelectedCard] = useState(null);
  const [revealedCardIds, setRevealedCardIds] = useState(new Set());
  const [isProcessingReveal, setIsProcessingReveal] = useState(false);
  const hasAutoOpenedRef = useRef(false);

  const closeModal = useCallback(() => {
    setSelectedCard(null);
    router.replace(pathname);
  }, [pathname, router]);

  useEffect(() => {
    if (isSuccess && !hasAutoOpenedRef.current && unscratchedCards.length > 0) {
      setSelectedCard(unscratchedCards[0]);
      hasAutoOpenedRef.current = true;
      toast.success("🎁 You've earned a new reward! Scratch to reveal.", { duration: 4000 });
    }
  }, [isSuccess, unscratchedCards]);

  useEffect(() => {
    if (lastArrival && isSuccess && !hasAutoOpenedRef.current) {
      setSelectedCard(lastArrival);
      hasAutoOpenedRef.current = true;
      toast.success("🎁 You've earned a new reward! Scratch to reveal.", { duration: 4000 });
    }
  }, [lastArrival, isSuccess]);

  const handleScratchComplete = useCallback(async (cardId) => {
    if (isProcessingReveal) return;
    setIsProcessingReveal(true);
    try {
      const res = await fetch(`/api/rewards/scratch/${cardId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok && data.code !== 'already_scratched') throw new Error(data.code || 'Failed to claim reward');
      setRevealedCardIds(prev => new Set(prev).add(cardId));
      if (data.pointsWon > 0) toast.success(`🎉 Won ${data.pointsWon} Points!`);
      setTimeout(() => {
        markScratched(cardId);
        setRevealedCardIds(prev => { const s = new Set(prev); s.delete(cardId); return s; });
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
      setLoading(true);
      const { data: userProfileData } = await supabase.from("user_profiles").select("full_name, email, phone").eq("id", userId).single();
      setUserProfile(userProfileData);

      const shoppingPromise = supabase.from("shopping_order_groups").select(`*, shopping_order_items (*, shopping_products (title, product_images, mrp_paise, suggested_retail_price_paise, category), merchants (business_name))`).eq("customer_id", userId).in("status", ["completed", "pending"]).order("created_at", { ascending: false });
      const nfcPromise = fetch('/api/nfc/orders').then(r => r.json()).catch(() => ({ orders: [] }));
      const giftcardsPromise = supabase.from('orders').select(`id, amount, created_at, payment_method, coupons:coupons!orders_giftcard_id_fkey(id, brand, title, selling_price_paise, face_value_paise, status, purchased_at, valid_until, merchant_id, merchant:merchants(business_name))`).eq('user_id', userId).eq('payment_status', 'paid').order('created_at', { ascending: false });
      const udhariPromise = supabase.from('udhari_requests').select(`id, coupon_id, status, due_date, amount_paise, duration_days, coupons:coupons!udhari_requests_coupon_id_fkey(id, brand, title, selling_price_paise, face_value_paise, status, valid_until, merchant_id, merchant:merchants(business_name))`).eq('customer_id', userId).eq('status', 'approved').order('created_at', { ascending: false });
      const solarPromise = supabase.from('solar_leads').select('*').eq('user_id', userId).order('created_at', { ascending: false });

      const [shoppingRes, nfcRes, giftcardsRes, udhariRes, solarRes] = await Promise.all([shoppingPromise, nfcPromise, giftcardsPromise, udhariPromise, solarPromise]);

      setGroups(shoppingRes.data || []);
      setNfcOrders(nfcRes.orders || []);
      setSolarLeads(solarRes.data || []);
      
      const formattedGc = [];
      (giftcardsRes.data || []).forEach(order => {
          if (order.coupons) {
              formattedGc.push({ type: 'giftcard', id: order.id, created_at: order.created_at, coupon: order.coupons, paidAmount: order.amount, uiStatus: order.coupons.status, paymentMethod: order.payment_method });
          }
      });
      (udhariRes.data || []).forEach(u => {
          if (u.coupons) {
              formattedGc.push({ type: 'giftcard', id: u.id, created_at: u.created_at, coupon: u.coupons, paidAmount: u.amount_paise / 100, uiStatus: 'pending-payment', dueDate: u.due_date, paymentMethod: 'udhari' });
          }
      });
      setGiftCards(formattedGc.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      console.error("Error fetching customer orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [userId]);

  const allOrders = useMemo(() => {
    let combined = [];
    if (activeFilter === 'All' || activeFilter === 'Shopping') combined = [...combined, ...groups.map(o => ({ ...o, _type: 'shopping' }))];
    if (activeFilter === 'All' || activeFilter === 'NFC Cards') combined = [...combined, ...nfcOrders.map(o => ({ ...o, _type: 'nfc' }))];
    if (activeFilter === 'All' || activeFilter === 'Gift Cards') combined = [...combined, ...giftCards.map(o => ({ ...o, _type: 'giftcard' }))];
    if (activeFilter === 'All' || activeFilter === 'Solar') combined = [...combined, ...solarLeads.map(o => ({ ...o, _type: 'solar' }))];
    return combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [activeFilter, groups, nfcOrders, giftCards, solarLeads]);

  const getNfcStatusConfig = (status, paymentStatus) => {
    if (paymentStatus === 'pending') return { icon: Clock, label: 'Payment Pending', color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' };
    if (status === 'shipped') return { icon: Truck, label: 'Shipped', color: 'text-blue-500', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' };
    if (status === 'delivered') return { icon: CheckCircle2, label: 'Delivered', color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' };
    if (status === 'cancelled') return { icon: X, label: 'Cancelled', color: 'text-red-500', bg: isDark ? 'bg-red-500/10' : 'bg-red-50' };
    return { icon: Clock, label: 'Processing', color: 'text-blue-500', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' };
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-pulse mt-4">
        <div className={`h-40 rounded-[2rem] sm:rounded-[3rem] ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
        <div className="flex gap-2 pb-2 pt-2">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-10 w-24 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
            ))}
        </div>
        <div className="space-y-5">
            {[1, 2, 3].map(i => (
                <div key={i} className={`h-48 rounded-[2rem] ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
            ))}
        </div>
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

      {/* Filter Bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-2 sticky top-20 z-40 bg-[#F8FAFC]/80 dark:bg-[#0c0e16]/80 backdrop-blur-md">
        {FILTER_OPTIONS.map((opt) => (
            <button
                key={opt}
                onClick={() => setActiveFilter(opt)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${activeFilter === opt
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : `bg-white dark:bg-[#111318] ${isDark ? 'text-white/60 border border-white/10' : 'text-slate-600 border border-slate-200'} hover:border-blue-500/50`
                    }`}
            >
                {opt}
            </button>
        ))}
      </div>

      {allOrders.length === 0 ? (
        <div className={`text-center py-20 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border mt-4 ${isDark ? 'bg-[#0c0e16] border-white/[0.04]' : 'bg-white border-slate-100'} flex flex-col items-center`}>
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-6">
              <Image src="/intrust_delivery_graphic.png" alt="No Orders Graphic" fill className="object-contain drop-shadow-xl" unoptimized />
          </div>
          <h3 className={`text-2xl font-black mb-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>No orders found</h3>
          <p className={`text-sm mb-8 max-w-xs mx-auto ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Looks like you haven't made any purchases for this category yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {allOrders.map((order) => {
            
            if (order._type === 'shopping') {
              const group = order;
              return (
                <div key={`shop_${group.id}`} className={`relative overflow-hidden rounded-[2rem] border shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all ${isDark ? 'bg-[#0c0e16] border-white/[0.04]' : 'bg-white border-slate-100'}`}>
                  {/* Shopping Render */}
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
                      </div>
                    </div>
                  </div>
                  <div className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-slate-100'}`}>
                    {group.shopping_order_items?.map((item) => (
                      <div key={item.id} className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-5 group-hover:bg-slate-50/50 transition-colors">
                        <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden relative ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                          {item.shopping_products?.product_images?.[0] ? (
                            <Image src={item.shopping_products.product_images[0]} alt={item.shopping_products.title} fill sizes="100px" className="object-contain p-2 mix-blend-multiply dark:mix-blend-normal" quality={60} />
                          ) : <Package size={32} className={isDark ? 'text-white/10' : 'text-slate-300'} />}
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className={`font-black text-sm sm:text-base leading-snug line-clamp-2 mb-1 tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.shopping_products?.title}</h4>
                            <div className={`text-[10px] sm:text-xs font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{item.shopping_products?.category || 'Category'}</div>
                          </div>
                          <div className="mt-4 flex items-end justify-between">
                            <div className={`font-black text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{((item.unit_price_paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                            <div className={`text-xs font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>Qty: {item.quantity}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 ${isDark ? 'bg-white/[0.01] border-t border-white/[0.04]' : 'bg-slate-50 border-t border-slate-100'}`}>
                    <Link href={`/orders/${group.id}`} className="w-full sm:w-auto text-center px-6 py-2.5 bg-transparent border hover:bg-slate-50 dark:hover:bg-white/5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all" style={{ borderColor: primaryColor, color: primaryColor }}>View Details</Link>
                  </div>
                </div>
              );
            }

            if (order._type === 'nfc') {
              const statusConfig = getNfcStatusConfig(order.status, order.payment_status);
              const StatusIcon = statusConfig.icon;
              return (
                  <div key={`nfc_${order.id}`} className={`relative overflow-hidden rounded-[2rem] border shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all ${isDark ? 'bg-[#111318] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
                      <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{order.card_holder_name} (NFC Card)</h3>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${statusConfig.color} ${statusConfig.bg}`}>
                                      <StatusIcon size={10} /> {statusConfig.label}
                                  </span>
                              </div>
                              <div className={`text-sm space-y-1 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                                  <p className="flex items-center gap-1.5"><CreditCard size={12} /> ₹{(order.sale_price_paise / 100).toLocaleString()} via {order.payment_method}</p>
                                  <p className="flex items-center gap-1.5"><Clock size={12} /> {format(new Date(order.created_at), "dd MMM yyyy")}</p>
                              </div>
                          </div>
                          <p className={`text-xs font-mono shrink-0 ${isDark ? 'text-white/20' : 'text-slate-400'}`}>#{order.id?.slice(-6).toUpperCase()}</p>
                      </div>
                      <div className={`p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 ${isDark ? 'bg-white/[0.01] border-t border-white/[0.04]' : 'bg-slate-50 border-t border-slate-100'}`}>
                          <Link href={`/orders/${order.id}`} className="w-full sm:w-auto text-center px-6 py-2.5 bg-transparent border hover:bg-slate-50 dark:hover:bg-white/5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all" style={{ borderColor: primaryColor, color: primaryColor }}>View Details</Link>
                      </div>
                  </div>
              );
            }

            if (order._type === 'giftcard') {
                const coupon = order.coupon;
                const isInactive = order.uiStatus !== 'active';
                const savings = ((coupon.face_value_paise || 0) / 100 - order.paidAmount).toFixed(0);
                const monogram = (coupon.brand || 'GC').slice(0, 2).toUpperCase();

                return (
                  <div key={`gc_${order.id}`} className={`relative overflow-hidden rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all ${isInactive ? 'grayscale-[30%] opacity-80' : ''}`}>
                      <div className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600`} />
                      <div className="relative z-10 flex items-start justify-between px-5 pt-5 pb-8">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner">
                                  <span className="text-white font-black text-sm tracking-wide">{monogram}</span>
                              </div>
                              <div>
                                  <div className="text-white font-black text-xl leading-tight drop-shadow">{coupon.brand}</div>
                                  <div className="text-white/60 text-xs font-medium mt-0.5">{coupon.merchant?.business_name || 'Gift Card'}</div>
                              </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${order.uiStatus === 'active' ? 'bg-white/90 text-green-600' : order.uiStatus === 'pending-payment' ? 'bg-amber-100/90 text-amber-700' : 'bg-black/20 text-white border border-white/30'}`}>
                              {order.uiStatus === 'active' ? '✓ Active' : order.uiStatus === 'pending-payment' ? '⏳ Pending Payment' : order.uiStatus.charAt(0).toUpperCase() + order.uiStatus.slice(1)}
                          </span>
                      </div>
                      <div className={`relative z-10 mx-3 mb-3 rounded-2xl shadow-2xl ${isDark ? 'bg-[#0c0e16]' : 'bg-white'}`}>
                          <div className="p-5 sm:p-6">
                              <div className={`flex items-start justify-between mb-5 pb-5 border-b ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                                  <div>
                                      <div className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Face Value</div>
                                      <div className="text-3xl font-black bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent leading-none">₹{(coupon.face_value_paise || 0) / 100}</div>
                                  </div>
                                  <div className="text-right">
                                      <div className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>You Paid</div>
                                      <div className={`text-2xl font-black leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{order.paidAmount}</div>
                                      {Number(savings) > 0 && order.uiStatus !== 'pending-payment' && (
                                          <div className="text-xs font-bold text-emerald-500 mt-1 flex items-center justify-end gap-1"><TrendingUp size={11} /> Saved ₹{savings}</div>
                                      )}
                                  </div>
                              </div>
                              <CouponCodeReveal couponId={order.id} />
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      generateOrderInvoice({
                                          order: { id: order.id, created_at: order.created_at, customer_name: userProfile?.full_name || 'Customer', faceValue: (coupon.face_value_paise || 0) / 100, paidAmount: order.paidAmount, brand: coupon.brand, giftcard_name: `${coupon.brand} Gift Card` },
                                          items: [],
                                          seller: { name: 'Intrust Financial Services (India) Pvt. Ltd.', address: 'TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Naga, Bhopal, MP 462026', phone: '18002030052', gstin: '23AAFC14866A1ZV' },
                                          customer: { name: userProfile?.full_name || 'Customer', phone: userProfile?.phone || '', address: '' },
                                          type: 'giftcard'
                                      });
                                  }}
                                  className={`w-full mt-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all active:scale-95 ${isDark ? 'bg-white/5 text-slate-400 border-white/10 hover:bg-blue-500/10 hover:text-blue-400' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}
                              >
                                  <Download size={14} /> Download Invoice
                              </button>
                              <Link href={`/orders/${order.id}`} className={`w-full mt-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center border transition-all ${isDark ? 'border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
                                  View Details
                              </Link>
                          </div>
                      </div>
                  </div>
                );
            }
            if (order._type === 'solar') {
                const getStatusColor = (s) => {
                    if (s === 'new') return isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-800';
                    if (s === 'contacted') return isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-800';
                    if (s === 'converted') return isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800';
                    if (s === 'lost') return isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800';
                    return isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800';
                };

                return (
                    <div key={`solar_${order.id}`} className={`relative overflow-hidden rounded-[2rem] border shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all ${isDark ? 'bg-[#0c0e16] border-white/[0.04]' : 'bg-white border-slate-100'}`}>
                        <div className={`p-5 sm:p-6 border-b ${isDark ? 'border-white/[0.04] bg-white/[0.01]' : 'border-slate-100 bg-slate-50'}`}>
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${getStatusColor(order.status)}`}>
                                            {order.status || 'New'}
                                        </span>
                                        <span className={`text-xs font-bold uppercase tracking-wider opacity-60 ${isDark ? 'text-white' : 'text-slate-500'}`}>
                                            Inquiry #{order.id.slice(0, 8)}
                                        </span>
                                    </div>
                                    <div className={`flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                                        <span className="flex items-center gap-1.5"><Clock size={14} /> {format(new Date(order.created_at), "dd MMM yyyy, h:mm a")}</span>
                                        <span className="flex items-center gap-1.5"><MapPin size={14} /> {order.address ? (order.address.slice(0, 30) + (order.address.length > 30 ? '...' : '')) : order.city}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-start sm:items-end">
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Est. Bill</p>
                                    <p className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {order.monthly_bill_range}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className={`p-5 sm:p-6 flex items-center justify-between gap-4 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-100 text-amber-600'}`}>
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h4 className={`font-black text-sm sm:text-base leading-snug tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>Solar Panel Request</h4>
                                    <div className={`text-[10px] sm:text-xs font-bold capitalize ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{order.property_type} Property</div>
                                </div>
                            </div>
                        </div>
                        <div className={`p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 ${isDark ? 'bg-white/[0.01] border-t border-white/[0.04]' : 'bg-slate-50 border-t border-slate-100'}`}>
                            <Link href={`/orders/${order.id}`} className="w-full sm:w-auto text-center px-6 py-2.5 bg-transparent border hover:bg-slate-50 dark:hover:bg-white/5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all" style={{ borderColor: primaryColor, color: primaryColor }}>View Details</Link>
                        </div>
                    </div>
                );
            }
            return null;
          })}
        </div>
      )}

      {/* Premium Reward Scratch Modal */}
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrdersClient;
