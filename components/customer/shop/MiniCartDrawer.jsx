'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, ShieldCheck, CheckCircle, Store } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getProductFallbackImage } from '@/lib/shopping/categories';
import toast from 'react-hot-toast';

export default function MiniCartDrawer({ isOpen, onClose }) {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchCart = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shopping_cart')
        .select(`
          id,
          quantity,
          inventory_id,
          variant_id,
          is_platform_item,
          merchant_inventory (
            id,
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
            platform_price_paise,
            category
          )
        `)
        .eq('customer_id', user.id);

      if (!error && data) {
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to load mini cart:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    if (isOpen) {
      fetchCart();
    }
  }, [isOpen, fetchCart]);

  useEffect(() => {
    const handleCartUpdate = () => {
      if (isOpen) {
        fetchCart();
      }
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [isOpen, fetchCart]);

  const updateQuantity = async (cartItemId, newQty) => {
    if (newQty < 1) {
      removeItem(cartItemId);
      return;
    }

    setUpdatingId(cartItemId);
    setItems((prev) =>
      prev.map((item) => (item.id === cartItemId ? { ...item, quantity: newQty } : item))
    );

    try {
      const { error } = await supabase
        .from('shopping_cart')
        .update({ quantity: newQty })
        .eq('id', cartItemId);

      if (error) throw error;
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error('Update qty error:', err);
      toast.error('Could not update quantity');
      fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (cartItemId) => {
    setUpdatingId(cartItemId);
    setItems((prev) => prev.filter((item) => item.id !== cartItemId));

    try {
      const { error } = await supabase
        .from('shopping_cart')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;
      window.dispatchEvent(new Event('cartUpdated'));
      toast.success('Item removed');
    } catch (err) {
      console.error('Remove item error:', err);
      toast.error('Could not remove item');
      fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  // Pricing calculations
  const { itemTotal, count } = useMemo(() => {
    let total = 0;
    let totalCount = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 1;
      totalCount += qty;
      const product = item.shopping_products;
      const pricePaise = item.is_platform_item
        ? product?.platform_price_paise || product?.suggested_retail_price_paise || 0
        : item.merchant_inventory?.retail_price_paise || product?.platform_price_paise || 0;
      total += (pricePaise / 100) * qty;
    });

    return { itemTotal: Math.round(total), count: totalCount };
  }, [items]);

  const deliveryFee = itemTotal >= 499 || itemTotal === 0 ? 0 : 49;
  const grandTotal = itemTotal + deliveryFee;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 260 }}
            className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-surface-container-lowest text-on-surface shadow-2xl z-50 flex flex-col justify-between border-l border-outline-variant/30"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-on-surface">
                    Your Cart
                  </h3>
                  <p className="text-[11px] text-on-surface-variant font-medium">
                    {count} {count === 1 ? 'item' : 'items'} ready for checkout
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-outline-variant/10">
              {loading && items.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-on-surface-variant">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-semibold">Loading items...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant">
                    <ShoppingBag size={28} />
                  </div>
                  <h4 className="font-black text-sm text-on-surface">Your cart is empty</h4>
                  <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                    Explore our local verified stores and fresh catalog to add items to your cart.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push('/shop');
                    }}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => {
                  const product = item.shopping_products;
                  const pricePaise = item.is_platform_item
                    ? product?.platform_price_paise || product?.suggested_retail_price_paise || 0
                    : item.merchant_inventory?.retail_price_paise || product?.platform_price_paise || 0;
                  const unitPrice = Math.round(pricePaise / 100);
                  const title = item.merchant_inventory?.custom_title || product?.title || 'Product Item';
                  const image = getProductFallbackImage(product);
                  const storeName = item.merchant_inventory?.merchants?.business_name || 'InTrust Direct';

                  return (
                    <div key={item.id} className="pt-3.5 first:pt-0 flex items-center justify-between gap-3">
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-surface-container-low shrink-0 overflow-hidden p-1.5 flex items-center justify-center border border-outline-variant/20">
                        <img src={image} alt={title} className="w-full h-full object-contain" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-xs sm:text-sm text-on-surface line-clamp-1 leading-tight">
                          {title}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant font-medium truncate mt-0.5">
                          {storeName}
                        </p>
                        <div className="text-xs sm:text-sm font-black text-primary mt-1">
                          ₹{unitPrice}
                        </div>
                      </div>

                      {/* Stepper & Trash */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="flex items-center gap-1.5 bg-surface-container rounded-xl px-1.5 py-1 border border-outline-variant/20 shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={updatingId === item.id}
                            className="w-6 h-6 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high flex items-center justify-center text-on-surface text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            <Minus size={11} strokeWidth={2.5} />
                          </button>
                          <span className="w-5 text-center text-xs font-black text-on-surface">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={updatingId === item.id}
                            className="w-6 h-6 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high flex items-center justify-center text-on-surface text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            <Plus size={11} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Bill & Checkout */}
            {items.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-outline-variant/20 bg-surface-container-low/50 space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-on-surface-variant font-medium">
                    <span>Item Total</span>
                    <span>₹{itemTotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant font-medium">
                    <span>Delivery Fee</span>
                    <span>{deliveryFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `₹${deliveryFee}`}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-black text-on-surface pt-2 border-t border-outline-variant/20">
                    <span>Total (Incl. taxes)</span>
                    <span className="text-primary text-base">₹{grandTotal}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push('/shop/cart');
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
