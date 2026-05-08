"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Wallet,
  AlertCircle,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Receipt,
  Phone,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Package,
  CreditCard,
  Banknote,
  BadgeCheck,
  PartyPopper,
  X,
  Store,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SabpaisaPaymentModal from "@/components/payment/SabpaisaPaymentModal";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

const CartClient = ({ userId, initialPlatformStatus }) => {
  const [cartItems, setCartItems] = useState([]);
  const [stockWarnings, setStockWarnings] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [isPlatformOpen, setIsPlatformOpen] = useState(initialPlatformStatus?.is_open ?? true);
  const [merchantStatuses, setMerchantStatuses] = useState(new Map()); // Map<id, is_open>
  const [paymentMode, setPaymentMode] = useState('wallet');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [draftGroupId, setDraftGroupId] = useState(null);
  const [draftAmount, setDraftAmount] = useState(null);
  const [udhariEnabled, setUdhariEnabled] = useState(false);
  const [udhariDisabledReason, setUdhariDisabledReason] = useState(null);
  const [storeCreditDuration, setStoreCreditDuration] = useState(10);
  const [creditRequestSent, setCreditRequestSent] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address: "", city: "", state: "", pincode: "", phone: ""
  });
  const supabase = createClient();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: cart, error: cartError } = await supabase
        .from("shopping_cart")
        .select(`
          id,
          quantity,
          inventory_id,
          is_platform_item,
          merchant_inventory (
            retail_price_paise,
            custom_title,
            merchants (id, business_name, is_open)
          ),
          shopping_products (
            id,
            slug,
            title,
            product_images,
            mrp_paise,
            suggested_retail_price_paise,
            category,
            gst_percentage
          )
        `)
        .eq("customer_id", userId);

      if (cartError) throw cartError;
      setCartItems(cart || []);

      if (cart && cart.length > 0) {
        const warnings = new Map();
        const platformProductIds = cart.filter(i => i.is_platform_item).map(i => i.shopping_products?.id).filter(Boolean);
        const merchantInventoryIds = cart.filter(i => !i.is_platform_item).map(i => i.inventory_id).filter(Boolean);

        const [platformStockRes, merchantStockRes] = await Promise.all([
          platformProductIds.length > 0
            ? supabase.from('shopping_products').select('id, admin_stock').in('id', platformProductIds)
            : Promise.resolve({ data: [] }),
          merchantInventoryIds.length > 0
            ? supabase.from('merchant_inventory').select('id, stock_quantity').in('id', merchantInventoryIds)
            : Promise.resolve({ data: [] })
        ]);

        const platformStockMap = new Map((platformStockRes.data || []).map(p => [p.id, p.admin_stock || 0]));
        const merchantStockMap = new Map((merchantStockRes.data || []).map(m => [m.id, m.stock_quantity || 0]));

        for (const item of cart) {
          const liveStock = item.is_platform_item
            ? platformStockMap.get(item.shopping_products?.id) || 0
            : merchantStockMap.get(item.inventory_id) || 0;

          if (liveStock < item.quantity || liveStock === 0) {
            warnings.set(item.id, liveStock);
          }
        }
        setStockWarnings(warnings);

        // Update merchant statuses map
        const statusMap = new Map();
        for (const item of cart) {
          if (!item.is_platform_item && item.merchant_inventory?.merchants) {
            statusMap.set(item.merchant_inventory.merchants.id, item.merchant_inventory.merchants.is_open);
          }
        }
        setMerchantStatuses(statusMap);
      } else {
        setStockWarnings(new Map());
        setMerchantStatuses(new Map());
      }

      const { data: wallet } = await supabase
        .from("customer_wallets")
        .select("balance_paise")
        .eq("user_id", userId)
        .single();
      setWalletBalance(wallet?.balance_paise || 0);

      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("full_name, phone, address")
        .eq("id", userId)
        .single();
      setProfile(userProfile);

      // Fetch udhari settings for the merchant in the cart (if any)
      if (cart && cart.length > 0) {
        if (cart.every(i => i.is_platform_item)) {
          setUdhariEnabled(false);
          setUdhariDisabledReason('platform');
        } else {
          const nonPlatformItems = cart.filter(i => !i.is_platform_item);
          const inventoryIds = nonPlatformItems.map(i => i.inventory_id).filter(Boolean);

          if (inventoryIds.length > 0) {
            const { data: merchantsData, error: merchantsError } = await supabase
              .from('merchant_inventory')
              .select('merchant_id')
              .in('id', inventoryIds);

            if (merchantsError || !merchantsData) return;

            const merchantIds = merchantsData.map(m => m.merchant_id).filter(id => id && id !== 'null');
            const uniqueMerchants = [...new Set(merchantIds)];

            if (uniqueMerchants.length > 1) {
              setUdhariEnabled(false);
              setUdhariDisabledReason('mixed');
            } else if (uniqueMerchants.length === 1) {
              const { data: settings } = await supabase
                .from('merchant_udhari_settings')
                .select('udhari_enabled')
                .eq('merchant_id', uniqueMerchants[0]);

              if (settings && settings.length > 0) {
                setUdhariEnabled(settings[0].udhari_enabled === true);
              } else {
                setUdhariEnabled(false);
              }
              setUdhariDisabledReason(null);
            }
          }
        }
      }

      if (userProfile) {
        const p = (userProfile.address || "").split(',').map(s => s.trim());
        setAddressForm({
          address: p[0] || "",
          city: p[1] || "",
          state: p[2] || "",
          pincode: p[3] || "",
          phone: userProfile.phone || ""
        });
      }
    } catch (err) {
      console.error("Error fetching cart data:", err);
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [userId]);

  // Real-time synchronization for store status
  useEffect(() => {
    // 1. Sync Platform Store
    const platformChannel = supabase
      .channel('cart_platform_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings', filter: 'key=eq.platform_store' }, (payload) => {
        if (payload.new?.value) {
          try {
            const parsed = JSON.parse(payload.new.value);
            setIsPlatformOpen(parsed.is_open);
          } catch (e) { }
        }
      })
      .subscribe();

    // 2. Sync Merchants in cart
    const activeMerchantIds = Array.from(merchantStatuses.keys());
    if (activeMerchantIds.length === 0) return () => { supabase.removeChannel(platformChannel); };

    const merchantChannel = supabase
      .channel('cart_merchants_sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'merchants'
      }, (payload) => {
        if (payload.new && activeMerchantIds.includes(payload.new.id)) {
          setMerchantStatuses(prev => {
            const next = new Map(prev);
            next.set(payload.new.id, payload.new.is_open);
            return next;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(platformChannel);
      supabase.removeChannel(merchantChannel);
    };
  }, [merchantStatuses.size > 0]);

  const isAnyStoreClosed = React.useMemo(() => {
    const hasPlatformItems = cartItems.some(i => i.is_platform_item);
    if (hasPlatformItems && !isPlatformOpen) return true;

    // Check merchants
    for (const [id, isOpen] of merchantStatuses.entries()) {
      if (!isOpen) return true;
    }
    return false;
  }, [cartItems, isPlatformOpen, merchantStatuses]);

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const combinedAddress = [addressForm.address, addressForm.city, addressForm.state, addressForm.pincode]
        .filter(Boolean)
        .join(', ');

      let finalPhone = (addressForm.phone || '').replace(/[^\d+]/g, '');
      if (/^\d{10}$/.test(finalPhone)) finalPhone = '+91' + finalPhone;

      const { error } = await supabase.from('user_profiles').update({
        address: combinedAddress,
        phone: finalPhone || null
      }).eq('id', userId);

      if (error) throw error;

      setProfile(prev => ({
        ...prev,
        address: combinedAddress,
        phone: addressForm.phone
      }));
      setIsAddressModalOpen(false);
    } catch (err) {
      console.error('Save address error:', err);
      setError('Failed to save delivery address');
    } finally {
      setSavingAddress(false);
    }
  };

  const updateQuantity = async (itemId, delta) => {
    const item = cartItems.find(i => i.id === itemId);
    const newQty = item.quantity + delta;
    if (newQty < 1) return removeItem(itemId);

    try {
      const { error } = await supabase.from("shopping_cart").update({ quantity: newQty }).eq("id", itemId);
      if (error) throw error;
      setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
    } catch (err) { console.error("Error updating qty:", err); }
  };

  const removeItem = async (itemId) => {
    try {
      const { error } = await supabase.from("shopping_cart").delete().eq("id", itemId);
      if (error) throw error;
      setCartItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err) { console.error("Error removing item:", err); }
  };

  const handleCheckout = async () => {
    // Guard: prevent double-submission if a draft order already exists
    if (draftGroupId) {
      setIsPaymentModalOpen(true);
      return;
    }

    try {
      setCheckingOut(true);
      setError(null);

      if (isAnyStoreClosed) {
        setError("Store is currently closed. Cannot place order.");
        setCheckingOut(false);
        return;
      }

      if (paymentMode === 'wallet') {
        const { data, error: rpcError } = await supabase.rpc("customer_checkout_v4", { p_customer_id: userId });
        if (rpcError) throw rpcError;
        if (data.success) {
          fetch('/api/shopping/notify-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_id: data.group_id, amount_paise: finalPayable })
          }).catch(console.error);

          setOrderSuccess(true);
          setTimeout(() => router.push("/orders?success=true"), 3000);
        } else {
          setError(data.message || "Checkout failed");
        }
      } else if (paymentMode === 'gateway') {
        const { data, error: rpcError } = await supabase.rpc("draft_cart_orders", { p_customer_id: userId });
        if (rpcError) throw rpcError;
        if (data.success) {
          setDraftGroupId(data.group_id);
          setDraftAmount(data.total_paise);
          setIsPaymentModalOpen(true);
          // Keep checkingOut=true — button stays locked until modal is closed
          return;
        } else {
          setError(data.message || "Checkout initialization failed");
        }
      } else if (paymentMode === 'store_credit') {
        // Step 1: Draft the cart orders to get a group_id
        const { data: draftData, error: draftError } = await supabase.rpc("draft_cart_orders", { p_customer_id: userId });
        if (draftError) throw draftError;
        if (!draftData.success) {
          setError(draftData.message || "Failed to create order draft");
          return;
        }

        const groupId = draftData.group_id;

        // Step 2: Resolve merchant ID from cart items
        const merchantItem = cartItems.find(i => !i.is_platform_item);
        let merchantId = null;
        if (merchantItem?.inventory_id) {
          const { data: invRow } = await supabase
            .from('merchant_inventory')
            .select('merchant_id')
            .eq('id', merchantItem.inventory_id)
            .single();
          merchantId = invRow?.merchant_id;
        }

        if (!merchantId) {
          setError("Could not determine merchant for store credit request.");
          return;
        }

        // Step 3: Call the store-credit request API
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/shopping/request-store-credit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            groupId,
            merchantId,
            durationDays: storeCreditDuration,
            amountPaise: draftData.total_paise,
          })
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error);

        // Step 4: Show a success overlay then redirect to store-credits
        setCreditRequestSent(true);
        setTimeout(() => router.push("/store-credits"), 3500);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      let errMsg = err.message || "Unexpected error during checkout";
      if (err.code === '23514') errMsg = "Data constraint violation: Stock may be insufficient or constraints failed.";
      else if (err.code === '23502') errMsg = "Missing required information for checkout.";
      else if (err.code === '23503') errMsg = "Referenced product or merchant not found.";
      setError(errMsg);
    } finally {
      setCheckingOut(false);
    }
  };

  // Bill
  const billDetails = cartItems.reduce((acc, item) => {
    const sellingPrice = item.is_platform_item
      ? (item.shopping_products?.suggested_retail_price_paise || 0)
      : (item.merchant_inventory?.retail_price_paise || item.shopping_products?.suggested_retail_price_paise || 0);

    const mrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || sellingPrice;
    const finalMrp = mrp > sellingPrice ? mrp : sellingPrice;
    const gstRate = item.shopping_products?.gst_percentage || 0;
    const gstAmount = Math.round(sellingPrice * item.quantity * gstRate / 100);
    acc.mrpTotal += (finalMrp * item.quantity);
    acc.sellingTotal += (sellingPrice * item.quantity);
    acc.gstTotal += gstAmount;
    return acc;
  }, { mrpTotal: 0, sellingTotal: 0, gstTotal: 0 });

  const totalDiscount = billDetails.mrpTotal > billDetails.sellingTotal ? billDetails.mrpTotal - billDetails.sellingTotal : 0;
  const deliveryFee = 9900; // Fixed ₹99 delivery fee
  const finalPayable = billDetails.sellingTotal > 0 ? billDetails.sellingTotal + billDetails.gstTotal + deliveryFee : 0;
  const itemCount = cartItems.reduce((a, i) => a + i.quantity, 0);
  const hasStockIssues = stockWarnings.size > 0;
  const hasValidAddress = profile && profile.address && profile.phone;

  const MIN_ORDER_VALUE = 49900;
  const isMinOrderMet = finalPayable >= MIN_ORDER_VALUE;

  const hasSufficientBalance = paymentMode === 'wallet' ? walletBalance >= finalPayable : true;
  const canPay = (
    paymentMode === 'wallet' ? walletBalance >= finalPayable :
      paymentMode === 'store_credit' ? udhariEnabled :
        true
  );
  const isPaymentModeValid = paymentMode === 'wallet' || paymentMode === 'gateway' || paymentMode === 'store_credit';
  const canCheckout = canPay && !hasStockIssues && hasValidAddress && isPaymentModeValid && isMinOrderMet && !isAnyStoreClosed;

  // Payment modes
  const paymentModes = [
    { id: 'wallet', label: 'InTrust Wallet', sub: `Balance: ₹${(walletBalance / 100).toLocaleString('en-IN')}`, icon: Wallet, color: '#10b981' },
    { id: 'gateway', label: 'UPI / Cards / Netbanking', sub: 'Pay via SabPaisa', icon: CreditCard, color: '#6366f1', disabled: false },
    { id: 'store_credit', label: 'Store Credit', sub: udhariEnabled ? 'Pay later — 0% interest' : udhariDisabledReason === 'platform' ? 'Not available for platform products' : udhariDisabledReason === 'mixed' ? 'Not available for mixed-merchant carts' : 'Not available for this merchant', icon: Clock, color: '#f59e0b', disabled: !udhariEnabled },
    { id: 'cod', label: 'Cash on Delivery', sub: 'Pay when delivered', icon: Banknote, color: '#94a3b8', disabled: true },
  ];

  // ========== STORE CREDIT REQUEST SENT OVERLAY ==========
  if (creditRequestSent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`fixed inset-0 z-[100] flex items-center justify-center ${isDark ? 'bg-[#080a10]' : 'bg-white'}`}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="text-center px-8 max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.4 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-500 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)]"
          >
            <Clock size={48} className="text-white" strokeWidth={2.5} />
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            Credit Request Sent! ⏳
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className={`text-sm font-medium mb-8 ${isDark ? 'text-white/40' : 'text-slate-500'}`}
          >
            Your order is pending merchant approval. You'll be notified once approved. Redirecting to Store Credits...
          </motion.p>

          <motion.div className={`w-full h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.5, duration: 3, ease: "linear" }}
              className="h-full rounded-full bg-amber-500"
            />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // ========== ORDER SUCCESS OVERLAY ==========
  if (orderSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`fixed inset-0 z-[100] flex items-center justify-center ${isDark ? 'bg-[#080a10]' : 'bg-white'}`}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="text-center px-8 max-w-md"
        >
          {/* Animated check circle */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.4 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)]"
          >
            <motion.div
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <CheckCircle size={48} className="text-white" strokeWidth={2.5} />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            Order Placed! 🎉
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className={`text-sm font-medium mb-8 ${isDark ? 'text-white/40' : 'text-slate-500'}`}
          >
            Your order has been confirmed. Redirecting to orders...
          </motion.p>

          {/* Animated progress bar */}
          <motion.div className={`w-full h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.5, duration: 2.5, ease: "linear" }}
              className="h-full rounded-full bg-blue-600"
            />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[60vh] gap-4 ${isDark ? 'bg-[#080a10]' : 'bg-[#f7f8fa]'}`}>
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className={`font-bold animate-pulse ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Loading your cart...</p>
      </div>
    );
  }

  // Empty
  if (cartItems.length === 0) {
    return (
      <div className={`min-h-screen pt-28 px-4 ${isDark ? 'bg-[#080a10]' : 'bg-[#f7f8fa]'}`}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`max-w-md mx-auto text-center py-16 px-6 rounded-2xl ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white shadow-sm border border-slate-100'}`}
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${isDark ? 'bg-blue-900/10' : 'bg-blue-50'}`}>
            <ShoppingBag className="w-9 h-9 text-blue-600" />
          </div>
          <h2 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Your cart is empty</h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/30' : 'text-slate-500'}`}>Add items to get started.</p>
          <Link href="/shop" className="inline-flex items-center justify-center w-full gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all active:scale-95">
            Shop Now
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-36 sm:pb-12 pt-24 md:pt-28 ${isDark ? 'bg-[#080a10] text-white' : 'bg-[#f7f8fa] text-slate-900'}`}>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 md:mb-8">
          <button onClick={() => router.back()} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${isDark ? 'bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Checkout</h1>
            <p className={`text-xs font-bold ${isDark ? 'text-white/25' : 'text-slate-400'}`}>{itemCount} item{itemCount !== 1 ? 's' : ''} in cart</p>
          </div>
        </div>

        {/* Global Store Status Warning */}
        <AnimatePresence>
          {isAnyStoreClosed && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className={`p-4 rounded-2xl flex items-start gap-3 bg-red-500 text-white shadow-lg overflow-hidden`}
            >
              <div className="p-2 bg-white/20 rounded-xl mt-0.5">
                <Store size={18} strokeWidth={3} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black uppercase tracking-tight">Store Currently Closed</h3>
                <p className="text-[11px] font-bold opacity-90 leading-relaxed mt-0.5">
                  Some items in your cart are from stores that are not currently accepting orders.
                  Please remove these items or wait for the store to open to proceed with your order.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

          {/* LEFT: Address + Items */}
          <div className="lg:col-span-7 space-y-4">

            {/* Delivery Address */}
            <motion.div
              initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className={`rounded-2xl p-4 sm:p-5 relative overflow-hidden ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
            >
              <div className={`absolute top-0 left-0 w-1 h-full bg-blue-600`} />
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-900/20 text-blue-500' : 'bg-blue-50 text-blue-600'}`}>
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-black text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Delivering to Home</h3>
                    {hasValidAddress ? (
                      <div className={`text-xs leading-relaxed font-medium ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                        <p className={`font-bold ${isDark ? 'text-white/70' : 'text-slate-700'}`}>{profile.full_name}</p>
                        <p className="line-clamp-2">{profile.address}</p>
                        {profile.phone && <p className="flex items-center gap-1 mt-1"><Phone size={10} /> {profile.phone}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-500 font-bold">Please update your address in profile.</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsAddressModalOpen(true)} className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg shrink-0 transition-colors ${isDark ? 'bg-white/[0.04] text-white/40 hover:text-white/70' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  {hasValidAddress ? 'Change' : 'Add Info'}
                </button>
              </div>
            </motion.div>

            {/* Cart Items */}
            <motion.div
              initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className={`rounded-2xl p-4 sm:p-5 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
            >
              <div className={`flex items-center justify-between mb-4 pb-3 border-b ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                <div className="flex flex-col">
                  <h2 className={`text-sm font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Items in Cart
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-white/[0.06] text-white/40' : 'bg-slate-100 text-slate-500'}`}>{cartItems.length}</span>
                  </h2>
                  {cartItems.length > 0 && (
                    <p className={`text-[10px] font-bold flex items-center gap-1.5 mt-0.5 ${isDark ? 'text-blue-500/70' : 'text-blue-600'}`}>
                      <Store size={10} />
                      Sold by {cartItems[0].is_platform_item ? "InTrust Official" : (cartItems[0].merchant_inventory?.merchants?.business_name || "Merchant")}
                    </p>
                  )}
                </div>
                <Link href="/shop" className="text-blue-600 text-xs font-black flex items-center gap-1 hover:underline">
                  <Plus size={14} /> Add more
                </Link>
              </div>

              <AnimatePresence mode="popLayout">
                {cartItems.map((item, idx) => {
                  const sellingPrice = item.is_platform_item
                    ? (item.shopping_products?.suggested_retail_price_paise || 0)
                    : (item.merchant_inventory?.retail_price_paise || item.shopping_products?.suggested_retail_price_paise || 0);
                  const mrp = item.shopping_products?.mrp_paise || item.shopping_products?.suggested_retail_price_paise || sellingPrice;
                  const finalMrp = mrp > sellingPrice ? mrp : sellingPrice;
                  const savings = finalMrp - sellingPrice;
                  const merchantName = item.is_platform_item ? "InTrust Official" : (item.merchant_inventory?.merchants?.business_name || "Merchant");
                  const liveStock = stockWarnings.has(item.id) ? stockWarnings.get(item.id) : null;
                  const hasStockIssue = liveStock !== null;

                  const merchantId = item.merchant_inventory?.merchants?.id;
                  const isItemStoreOpen = item.is_platform_item ? isPlatformOpen : (merchantStatuses.get(merchantId) ?? true);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex gap-3 pb-4 mb-4 border-b last:border-b-0 last:pb-0 last:mb-0 ${isDark ? 'border-white/[0.03]' : 'border-slate-50'}`}
                    >
                      <Link
                        href={`/shop/product/${item.shopping_products?.slug}`}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 p-1.5 flex items-center justify-center ${isDark ? 'bg-[#0c0e14] border border-white/[0.04]' : 'bg-slate-50 border border-slate-100'}`}
                      >
                        {item.shopping_products?.product_images?.[0] ? (
                          <img src={item.shopping_products.product_images[0]} alt="product" className={`w-full h-full object-contain ${isDark ? '' : 'mix-blend-multiply'}`} />
                        ) : (
                          <Package size={20} className={isDark ? 'text-white/10' : 'text-slate-200'} />
                        )}
                      </Link>

                      <div className="flex-grow flex flex-col justify-between min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <p className={`text-[9px] uppercase tracking-widest font-black ${isDark ? 'text-white/25' : 'text-slate-400'}`}>
                                {merchantName}
                              </p>
                              <BadgeCheck size={9} className="text-blue-600 shrink-0" />
                            </div>
                            <h3 className={`text-xs sm:text-sm font-bold leading-tight line-clamp-2 ${isDark ? 'text-white/80' : 'text-slate-800'}`}>
                              {item.merchant_inventory?.custom_title || item.shopping_products?.title}
                            </h3>
                            {!isItemStoreOpen && (
                              <div className="mt-1 flex gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-500 text-white flex items-center gap-1`}>
                                  <Store size={10} strokeWidth={3} />
                                  Store Closed
                                </span>
                              </div>
                            )}
                            {hasStockIssue && (
                              <div className="mt-1">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${isDark ? 'bg-red-900/20 text-red-400 border border-red-800/30' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                  {liveStock === 0 ? 'Out of Stock' : `Only ${liveStock} left`}
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className={`p-1.5 rounded-lg transition-all shrink-0 active:scale-90 ${isDark ? 'text-white/15 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="flex justify-between items-end mt-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{(sellingPrice / 100).toLocaleString('en-IN')}</span>
                              {savings > 0 && (
                                <>
                                  <span className={`text-[10px] line-through ${isDark ? 'text-white/15' : 'text-slate-400'}`}>₹{(finalMrp / 100).toLocaleString('en-IN')}</span>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                                    Save ₹{(savings / 100).toLocaleString('en-IN')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className={`flex items-center rounded-lg overflow-hidden h-7 ${isDark ? 'bg-blue-900/20 text-blue-400 border border-blue-800/20' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-full flex items-center justify-center hover:bg-black/5 active:scale-90 transition-all">
                              <Minus size={12} strokeWidth={3} />
                            </button>
                            <motion.span
                              key={item.quantity}
                              initial={{ scale: 1.3 }}
                              animate={{ scale: 1 }}
                              className={`w-7 text-center text-xs font-black h-full flex flex-col justify-center ${isDark ? 'bg-blue-900/20 border-x border-blue-800/10' : 'bg-white border-x border-blue-100'}`}
                            >
                              {item.quantity}
                            </motion.span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              disabled={hasStockIssue && item.quantity >= liveStock}
                              className={`w-7 h-full flex items-center justify-center transition-all ${hasStockIssue && item.quantity >= liveStock
                                  ? 'opacity-30 cursor-not-allowed'
                                  : 'hover:bg-black/5 active:scale-90'
                                }`}
                            >
                              <Plus size={12} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* RIGHT: Bill + Payment */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-24 space-y-4">

              {/* Bill Summary */}
              <motion.div
                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                className={`rounded-2xl p-4 sm:p-5 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
              >
                <h2 className={`text-sm font-black flex items-center gap-2 mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Receipt size={16} className={isDark ? 'text-white/30' : 'text-slate-400'} />
                  Bill Details
                </h2>

                <div className={`space-y-2.5 mb-4 text-xs font-medium ${isDark ? 'text-white/40' : 'text-slate-600'}`}>
                  <div className="flex justify-between">
                    <span>Item Total (MRP)</span>
                    <span>₹{(billDetails.mrpTotal / 100).toLocaleString('en-IN')}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-500">
                      <span>Product Discount</span>
                      <span>- ₹{(totalDiscount / 100).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST (Calculated)</span>
                    <span>₹{(billDetails.gstTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>₹{(deliveryFee / 100).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className={`border-t border-dashed pt-3 ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-end">
                    <span className={`text-sm font-extrabold ${isDark ? 'text-white/70' : 'text-slate-700'}`}>To Pay</span>
                    <motion.span
                      key={finalPayable}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}
                    >
                      ₹{(finalPayable / 100).toLocaleString('en-IN')}
                    </motion.span>
                  </div>
                </div>

                {/* Minimum order warning inside the bill section */}
                {!isMinOrderMet && billDetails.sellingTotal > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className={`mt-3 flex items-start gap-2 text-[11px] font-bold rounded-lg p-3 ${isDark ? 'bg-amber-900/10 text-amber-500 border border-amber-800/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
                  >
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <p>Minimum order value is <strong>₹499</strong>. Please add items worth ₹{((MIN_ORDER_VALUE - finalPayable) / 100).toLocaleString('en-IN')} more to checkout.</p>
                  </motion.div>
                )}

                {totalDiscount > 0 && isMinOrderMet && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className={`mt-3 flex items-center gap-2 text-[10px] font-black rounded-lg p-2.5 ${isDark ? 'bg-blue-900/20 text-blue-400 border border-blue-800/10' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}
                  >
                    <Sparkles size={12} />
                    You save ₹{(totalDiscount / 100).toLocaleString('en-IN')} on this order!
                  </motion.div>
                )}
              </motion.div>

              {/* ====== PAYMENT MODE SELECTION ====== */}
              <motion.div
                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                className={`rounded-2xl p-4 sm:p-5 ${isDark ? 'bg-[#12151c] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'}`}
              >
                <h2 className={`text-sm font-black flex items-center gap-2 mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <CreditCard size={16} className={isDark ? 'text-white/30' : 'text-slate-400'} />
                  Payment Method
                </h2>

                <div className="space-y-2.5">
                  {paymentModes.map(mode => {
                    const isSelected = paymentMode === mode.id;
                    const isDisabled = mode.disabled;

                    return (
                      <button
                        key={mode.id}
                        onClick={() => !isDisabled && setPaymentMode(mode.id)}
                        disabled={isDisabled}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left relative overflow-hidden ${isDisabled
                            ? `cursor-not-allowed ${isDark ? 'opacity-30' : 'opacity-40'}`
                            : isSelected
                              ? `${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'} ring-2`
                              : `${isDark ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'bg-slate-50/50 hover:bg-slate-50'}`
                          }`}
                        style={isSelected && !isDisabled ? {
                          ringColor: mode.color,
                          borderColor: mode.color,
                          ['--tw-ring-color']: mode.color
                        } : {}}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: isSelected ? `${mode.color}15` : isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
                            color: isSelected ? mode.color : isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8'
                          }}
                        >
                          <mode.icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-black ${isDark ? 'text-white/80' : 'text-slate-800'}`}>{mode.label}</p>
                          <p className={`text-[10px] font-medium ${isDark ? 'text-white/25' : 'text-slate-400'}`}>{mode.sub}</p>
                        </div>
                        {isSelected && !isDisabled && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                            <CheckCircle size={18} style={{ color: mode.color }} />
                          </motion.div>
                        )}
                        {isDisabled && (
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${isDark ? 'bg-white/[0.04] text-white/20' : 'bg-slate-100 text-slate-400'}`}>Soon</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Store Credit Duration Picker */}
                {paymentMode === 'store_credit' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 p-3 rounded-xl border ${isDark ? 'bg-amber-900/10 border-amber-800/20' : 'bg-amber-50 border-amber-200'}`}
                  >
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      Repayment Duration
                    </p>
                    <div className="flex gap-2">
                      {[5, 10, 15].map(days => (
                        <button
                          key={days}
                          onClick={() => setStoreCreditDuration(days)}
                          className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${storeCreditDuration === days
                              ? 'bg-amber-500 text-white shadow-md'
                              : isDark
                                ? 'bg-white/5 text-white/50 hover:bg-white/10'
                                : 'bg-white text-slate-500 hover:bg-amber-100 border border-amber-200'
                            }`}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                    <p className={`text-[10px] mt-2 font-medium ${isDark ? 'text-amber-400/60' : 'text-amber-600'}`}>
                      Convenience fee of 3% applies on settlement.
                    </p>
                  </motion.div>
                )}
              </motion.div>

              {/* Desktop Place Order */}
              <motion.div
                initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                className="hidden md:block"
              >
                {error && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl mb-3 ${isDark ? 'bg-red-900/15 border border-red-800/20' : 'bg-red-50 border border-red-100'}`}>
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className={`text-xs font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>{error}</p>
                  </div>
                )}

                <button
                  disabled={checkingOut || !canCheckout}
                  onClick={handleCheckout}
                  className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${!canCheckout
                      ? `cursor-not-allowed ${isDark ? 'bg-white/[0.04] text-white/20' : 'bg-slate-100 text-slate-400'}`
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_6px_20px_rgba(37,99,235,0.25)]"
                    }`}
                >
                  {checkingOut ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : isAnyStoreClosed ? (
                    "Store is currently closed"
                  ) : !isMinOrderMet ? (
                    `Add ₹${((MIN_ORDER_VALUE - billDetails.sellingTotal) / 100).toLocaleString('en-IN')} more to order`
                  ) : hasStockIssues ? (
                    "Some items out of stock"
                  ) : !hasValidAddress ? (
                    "Add Delivery Address"
                  ) : !hasSufficientBalance && paymentMode === 'wallet' ? (
                    "Insufficient Wallet Balance"
                  ) : !isPaymentModeValid ? (
                    "Coming Soon"
                  ) : (
                    <>Place Order <ArrowRight size={16} strokeWidth={3} /></>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <ShieldCheck size={12} className={isDark ? 'text-white/15' : 'text-slate-400'} />
                  <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-white/15' : 'text-slate-400'}`}>100% Secure Checkout</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className={`fixed bottom-0 left-0 w-full p-3 pb-5 sm:hidden z-50 border-t backdrop-blur-xl ${isDark ? 'bg-[#080a10]/90 border-white/[0.06]' : 'bg-white/95 border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'}`}>
        {error && (
          <div className={`flex items-center gap-2 p-2 rounded-lg mb-2 ${isDark ? 'bg-red-900/20 border border-red-800/20' : 'bg-red-50'}`}>
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <p className={`text-[10px] font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>{error}</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              {paymentMode === 'wallet' ? 'Pay via Wallet' : paymentMode === 'gateway' ? 'Pay via Gateway' : paymentMode === 'store_credit' ? 'Store Credit' : 'Cash on Delivery'}
            </span>
            <motion.p
              key={finalPayable}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className={`text-xl font-black leading-none mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              ₹{(finalPayable / 100).toLocaleString('en-IN')}
            </motion.p>
            {totalDiscount > 0 && (
              <p className="text-[10px] font-black text-emerald-500 mt-1 uppercase tracking-tighter">
                You Save ₹{(totalDiscount / 100).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          <button
            disabled={checkingOut || !canCheckout}
            onClick={handleCheckout}
            className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${!canCheckout
                ? `cursor-not-allowed ${isDark ? 'bg-white/[0.04] text-white/20' : 'bg-slate-100 text-slate-400'}`
                : "bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)]"
              }`}
          >
            {checkingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isAnyStoreClosed ? (
              "Store Closed"
            ) : !isMinOrderMet ? (
              `Add ₹${((MIN_ORDER_VALUE - billDetails.sellingTotal) / 100).toLocaleString('en-IN')} more`
            ) : hasStockIssues ? (
              "Out of stock items"
            ) : !hasValidAddress ? (
              "Add Address"
            ) : !canPay ? (
              paymentMode === 'wallet' ? "Low Balance" : paymentMode === 'store_credit' ? "Not Available" : " Coming Soon"
            ) : !isPaymentModeValid ? (
              "Coming Soon"
            ) : (
              <>Place Order <ArrowRight size={14} strokeWidth={3} /></>
            )}
          </button>
        </div>
      </div>

      {isPaymentModalOpen && (
        <SabpaisaPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            // Capture the draft ID before clearing it
            const cancelTarget = draftGroupId;
            // Re-enable buttons when modal is dismissed without completing payment
            setIsPaymentModalOpen(false);
            setCheckingOut(false);
            // Clear draft so a fresh one is created if they retry
            setDraftGroupId(null);
            // Fire-and-forget: tell the server to cancel the pending gateway draft
            if (cancelTarget) {
              supabase.auth.getSession().then(({ data: { session } }) => {
                fetch('/api/shopping/cancel-draft-order', {
                  method: 'POST',
                  keepalive: true,
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                  },
                  body: JSON.stringify({ groupId: cancelTarget }),
                }).catch(console.error);
              }).catch(console.error);
            }
          }}
          amount={(draftAmount || finalPayable) / 100}
          user={{ id: userId, email: profile?.email || '', phone: profile?.phone || '' }}
          productInfo={{ title: `${itemCount} Item${itemCount > 1 ? 's' : ''} in Cart` }}
          metadata={{ type: 'cart_checkout', groupId: draftGroupId }}
          initialMethod="gateway"
        />
      )}

      {/* ADDRESS MODAL */}
      <AnimatePresence>
        {isAddressModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isDark ? 'bg-[#080a10]/80' : 'bg-slate-900/60'} backdrop-blur-sm`}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`w-full max-w-sm rounded-[24px] p-5 sm:p-6 shadow-2xl ${isDark ? 'bg-[#12151c] border border-white/[0.08]' : 'bg-white border border-slate-100'}`}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Delivery Info</h3>
                <button onClick={() => setIsAddressModalOpen(false)} className={`p-1.5 rounded-xl active:scale-95 transition-all ${isDark ? 'bg-white/[0.05] text-white/50 hover:bg-white/[0.1] hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}>
                  <X size={16} strokeWidth={3} />
                </button>
              </div>

              <form onSubmit={handleSaveAddress} className="space-y-3.5">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Street Address</label>
                  <input required type="text" value={addressForm.address} onChange={e => setAddressForm(f => ({ ...f, address: e.target.value }))} className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold outline-none transition-all ${isDark ? 'bg-[#0c0e14] border border-white/[0.06] text-white focus:bg-transparent focus:border-blue-500/50' : 'bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100'}`} placeholder="House no, Street area" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>City</label>
                    <input required type="text" value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold outline-none transition-all ${isDark ? 'bg-[#0c0e14] border border-white/[0.06] text-white focus:bg-transparent focus:border-blue-500/50' : 'bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100'}`} placeholder="City" />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Pincode</label>
                    <input required type="text" value={addressForm.pincode} onChange={e => setAddressForm(f => ({ ...f, pincode: e.target.value }))} className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold outline-none transition-all ${isDark ? 'bg-[#0c0e14] border border-white/[0.06] text-white focus:bg-transparent focus:border-blue-500/50' : 'bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100'}`} placeholder="123456" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>State</label>
                    <input required type="text" value={addressForm.state} onChange={e => setAddressForm(f => ({ ...f, state: e.target.value }))} className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold outline-none transition-all ${isDark ? 'bg-[#0c0e14] border border-white/[0.06] text-white focus:bg-transparent focus:border-blue-500/50' : 'bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100'}`} placeholder="State" />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>Phone</label>
                    <input required type="tel" value={addressForm.phone} onChange={e => setAddressForm(f => ({ ...f, phone: e.target.value }))} className={`w-full px-3.5 py-3 rounded-xl text-sm font-semibold outline-none transition-all ${isDark ? 'bg-[#0c0e14] border border-white/[0.06] text-white focus:bg-transparent focus:border-blue-500/50' : 'bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100'}`} placeholder="9876543210" />
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={savingAddress} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.25)] flex justify-center items-center gap-2">
                    {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Continue"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CartClient;
