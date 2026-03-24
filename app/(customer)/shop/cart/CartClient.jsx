"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Store,
  Wallet,
  AlertCircle,
  Loader2,
  CheckCircle,
  ChevronLeft
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CartClient = ({ userId }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [error, setError] = useState(null);
  const supabase = createClient();
  const router = useRouter();

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Cart
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
            merchants (business_name)
          ),
          shopping_products (
            title,
            image_url,
            suggested_retail_price_paise
          )
        `)
        .eq("customer_id", userId);

      if (cartError) throw cartError;
      setCartItems(cart || []);

      // Fetch Wallet
      const { data: wallet } = await supabase
        .from("customer_wallets")
        .select("balance_paise")
        .eq("user_id", userId)
        .single();

      setWalletBalance(wallet?.balance_paise || 0);
    } catch (err) {
      console.error("Error fetching cart data:", err);
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const updateQuantity = async (itemId, delta) => {
    const item = cartItems.find(i => i.id === itemId);
    const newQty = item.quantity + delta;
    if (newQty < 1) return;

    try {
      const { error } = await supabase
        .from("shopping_cart")
        .update({ quantity: newQty })
        .eq("id", itemId);

      if (error) throw error;
      setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
    } catch (err) {
      console.error("Error updating qty:", err);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from("shopping_cart")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      setCartItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err) {
      console.error("Error removing item:", err);
    }
  };

  const handleCheckout = async () => {
    try {
      setCheckingOut(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc("customer_checkout_v4", {
        p_customer_id: userId
      });

      if (rpcError) throw rpcError;

      if (data.success) {
        router.push("/orders?success=true");
      } else {
        setError(data.message || "Checkout failed");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Unexpected error during checkout");
    } finally {
      setCheckingOut(false);
    }
  };

  const totalPaise = cartItems.reduce((acc, item) => {
    const price = item.is_platform_item
      ? (item.shopping_products?.suggested_retail_price_paise || 0)
      : (item.merchant_inventory?.retail_price_paise || 0);
    return acc + (price * item.quantity);
  }, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-gray-400 animate-pulse">Synchronizing with cloud cart...</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-20 px-4 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-400 mb-8 max-w-sm mx-auto">Looks like you haven't added anything to your cart yet. Explore our premium collections!</p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Left Column: Cart Items */}
      <div className="lg:col-span-8 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Items in Cart
            <span className="bg-white/10 text-sm px-3 py-1 rounded-full">{cartItems.length}</span>
          </h2>
          <Link href="/shop" className="text-emerald-400 text-sm font-medium hover:underline flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add more items
          </Link>
        </div>

        <div className="space-y-4">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 md:p-6 hover:border-white/20 transition-all group"
            >
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Image */}
                <div className="w-full sm:w-32 h-32 bg-white/10 rounded-2xl overflow-hidden flex-shrink-0 relative">
                  {item.shopping_products?.image_url ? (
                    <img
                      src={item.shopping_products.image_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <ShoppingBag className="w-10 h-10 text-gray-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-grow flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-lg font-bold group-hover:text-emerald-400 transition-colors">
                        {item.merchant_inventory?.custom_title || item.shopping_products?.title}
                      </h3>
                      <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-1">
                        <Store className="w-3.5 h-3.5 text-emerald-500/80" />
                        Sold by <span className="text-emerald-400/80 font-medium">{item.is_platform_item ? "InTrust Official" : (item.merchant_inventory?.merchants?.business_name || "Merchant")}</span>
                      </p>
                    </div>
                    <p className="text-xl font-black">
                      ₹{((item.is_platform_item ? (item.shopping_products?.suggested_retail_price_paise || 0) : (item.merchant_inventory?.retail_price_paise || 0)) * item.quantity / 100).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all active:scale-90"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Order Summary */}
      <div className="lg:col-span-4">
        <div className="sticky top-24 space-y-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8">
            <h2 className="text-2xl font-bold mb-8">Summary</h2>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>₹{(totalPaise / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span className="text-emerald-400">FREE</span>
              </div>
              <div className="h-px bg-white/10 my-6" />
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold">Total Amount</span>
                <span className="text-3xl font-black text-emerald-400">₹{(totalPaise / 100).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Wallet className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Available Balance</p>
                    <p className="font-bold">₹{(walletBalance / 100).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl animate-shake">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
              )}

              <button
                disabled={checkingOut || walletBalance < totalPaise}
                onClick={handleCheckout}
                className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${walletBalance < totalPaise
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed opacity-50"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)]"
                  }`}
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Processing...
                  </>
                ) : walletBalance < totalPaise ? (
                  "Insufficient Balance"
                ) : (
                  <>
                    Checkout Now
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-gray-500 uppercase tracking-widest font-black mt-4">
                Secure SSL Encrypted Transaction
              </p>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <p className="text-xs text-gerald-400">Quality assured directly by InTrust verified merchants.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartClient;
