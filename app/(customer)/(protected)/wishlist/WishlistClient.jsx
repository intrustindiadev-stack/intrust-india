'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Heart, ShoppingCart, Trash2, Package, Loader2, Store, ArrowLeft, Ban, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { isPlatformProductOOS, isInventoryRowOOS } from '@/lib/shopping/stock';
import OutOfStockBadge from '@/components/ui/OutOfStockBadge';
import OutOfStockOverlay from '@/components/ui/OutOfStockOverlay';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';

export default function WishlistClient({ userId, userEmail, initialItems = [] }) {
  const [items, setItems] = useState(initialItems);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [movingId, setMovingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingWishlistItem, setPendingWishlistItem] = useState(null);
  const [addingAllGroupKey, setAddingAllGroupKey] = useState(null);
  const [pendingGroup, setPendingGroup] = useState(null);
  const router = useRouter();

  // Client-side fetcher with fallback
  const fetchWishlist = useCallback(async (showToast = false) => {
    if (!userId) return;
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('user_wishlists')
        .select(`
          id, added_at, is_platform_item, inventory_id, variant_id, product_id, merchant_id,
          shopping_products ( id, slug, title, product_images, category, suggested_retail_price_paise, platform_price_paise, mrp_paise, admin_stock ),
          fashion_variants ( id, sku, size, color, fit, fabric, price_paise, compare_at_price_paise, inventory_quantity, is_active ),
          merchants ( id, business_name ),
          merchant_inventory ( retail_price_paise, stock_quantity, is_active )
        `)
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) {
        // Fallback: Query base wishlists and fetch products separately
        const { data: baseWishlists, error: baseErr } = await supabase
          .from('user_wishlists')
          .select('*')
          .eq('user_id', userId)
          .order('added_at', { ascending: false });

        if (baseErr) throw baseErr;

        if (baseWishlists && baseWishlists.length > 0) {
          const productIds = baseWishlists.map(w => w.product_id).filter(Boolean);
          const { data: prods } = await supabase
            .from('shopping_products')
            .select('id, slug, title, product_images, category, suggested_retail_price_paise, platform_price_paise, mrp_paise, admin_stock')
            .in('id', productIds);

          const prodMap = new Map((prods || []).map(p => [p.id, p]));
          const merged = baseWishlists.map(w => ({
            ...w,
            shopping_products: prodMap.get(w.product_id) || null
          }));
          setItems(merged);
        } else {
          setItems([]);
        }
      } else {
        setItems(data || []);
      }
      if (showToast) toast.success('Wishlist refreshed');
    } catch (err) {
      console.error('Failed to fetch wishlist client-side:', err);
      if (showToast) toast.error('Could not refresh wishlist');
    } finally {
      setIsRefreshing(false);
    }
  }, [userId]);

  // Initial client sync & Real-time channel
  useEffect(() => {
    fetchWishlist();

    const channel = supabase
      .channel(`user_wishlist_live_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_wishlists', filter: `user_id=eq.${userId}` },
        () => {
          fetchWishlist();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchWishlist]);

  // Group by merchant
  const grouped = useMemo(() => {
    const groups = {};
    for (const item of items) {
      const key = item.is_platform_item ? 'intrust-official' : (item.merchants?.id || 'unknown');
      const label = item.is_platform_item ? 'InTrust Official' : (item.merchants?.business_name || 'Verified Store');
      if (!groups[key]) groups[key] = { label, items: [] };
      groups[key].items.push(item);
    }
    return Object.values(groups);
  }, [items]);

  const removeFromWishlist = useCallback(async (id) => {
    setRemovingId(id);
    const { error } = await supabase.from('user_wishlists').delete().eq('id', id);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Removed from wishlist');
    } else {
      toast.error('Failed to remove item');
    }
    setRemovingId(null);
  }, []);

  const moveToCart = useCallback(async (item) => {
    const isOOS = item.variant_id && item.fashion_variants
      ? (item.fashion_variants.inventory_quantity ?? 0) <= 0
      : item.is_platform_item 
        ? isPlatformProductOOS(item.shopping_products)
        : isInventoryRowOOS(item.merchant_inventory);

    if (isOOS) {
      toast.error('This item is out of stock and cannot be added to cart');
      return;
    }

    setMovingId(item.id);
    try {
      const { data, error } = await supabase.rpc('add_to_shopping_cart', {
        p_customer_id: userId,
        p_inventory_id: item.is_platform_item ? null : item.inventory_id,
        p_product_id: item.shopping_products.id,
        p_variant_id: item.variant_id || null,
        p_quantity: 1,
        p_is_platform: item.is_platform_item
      });

      if (error) throw error;

      if (data?.message === 'MIXED_SELLER_ERROR') {
        setPendingWishlistItem(item);
        setConfirmModalOpen(true);
        return;
      }

      toast.success('Moved to cart!');
      router.push('/shop/cart');
    } catch (err) {
      console.error('Error moving to cart:', err);
      toast.error('Failed to move to cart');
    } finally {
      setMovingId(null);
    }
  }, [userId, router]);

  const addAllToCart = useCallback(async (group) => {
    const availableItems = group.items.filter(item => {
      if (item.variant_id && item.fashion_variants) {
        return (item.fashion_variants.inventory_quantity ?? 0) > 0;
      }
      return item.is_platform_item 
        ? !isPlatformProductOOS(item.shopping_products)
        : !isInventoryRowOOS(item.merchant_inventory);
    });

    if (availableItems.length === 0) {
      toast.error('All items in this group are currently out of stock');
      return;
    }

    setAddingAllGroupKey(group.label);
    try {
      const [first, ...rest] = availableItems;
      const { data, error } = await supabase.rpc('add_to_shopping_cart', {
        p_customer_id: userId,
        p_inventory_id: first.is_platform_item ? null : first.inventory_id,
        p_product_id: first.shopping_products.id,
        p_variant_id: first.variant_id || null,
        p_quantity: 1,
        p_is_platform: first.is_platform_item
      });

      if (error) throw error;

      if (data?.message === 'MIXED_SELLER_ERROR') {
        setPendingGroup(group);
        setConfirmModalOpen(true);
        return;
      }

      for (const item of rest) {
        await moveToCart(item);
      }

      toast.success('All items added to cart!');
      router.push('/shop/cart');
    } catch (err) {
      console.error('Error adding all to cart:', err);
      toast.error('Failed to add all items to cart');
    } finally {
      setAddingAllGroupKey(null);
    }
  }, [userId, router, moveToCart]);

  const handleConfirmClearCart = async () => {
    setConfirmModalOpen(false);
    if (pendingGroup) {
      const group = pendingGroup;
      setPendingGroup(null);
      setPendingWishlistItem(null);
      await supabase.from('shopping_cart').delete().eq('customer_id', userId);
      await addAllToCart(group);
    } else if (pendingWishlistItem) {
      const item = pendingWishlistItem;
      setPendingWishlistItem(null);
      try {
        await supabase.from('shopping_cart').delete().eq('customer_id', userId);
        await moveToCart(item);
      } catch (err) {
        console.error('Error clearing cart:', err);
      }
    }
  };

  const handleCancelClearCart = () => {
    setConfirmModalOpen(false);
    setPendingWishlistItem(null);
    setPendingGroup(null);
  };

  if (items.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <CustomerBreadcrumbs items={[{ label: 'Wishlist' }]} className="mb-2" />
        
        <div className="max-w-md mx-auto text-center py-16 px-6 rounded-3xl bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/30 shadow-sm space-y-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500">
            <Heart className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-on-surface">Your wishlist is empty</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-on-surface-variant">Save items you love to quickly purchase them later.</p>
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link href="/shop" className="inline-flex items-center justify-center flex-1 w-full gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs">
              Explore Shop Catalog
            </Link>
            <button
              onClick={() => fetchWishlist(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-100 dark:bg-surface-container-low hover:bg-slate-200 dark:hover:bg-surface-container-high text-slate-700 dark:text-on-surface font-bold rounded-xl transition-all text-xs"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              <span>{isRefreshing ? 'Checking...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 text-slate-900 dark:text-on-surface">
      <CustomerBreadcrumbs items={[{ label: 'Wishlist' }]} className="mb-2" />
      
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-outline-variant/20">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2.5 text-slate-900 dark:text-on-surface m-0 tracking-tight">
          <Heart className="text-rose-500 fill-rose-500" size={26} />
          <span>My Saved Items</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-surface-container-low text-slate-600 dark:text-brand-steel border border-slate-200 dark:border-outline-variant/20">
            {items.length}
          </span>
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchWishlist(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-brand-steel hover:text-slate-800 dark:hover:text-on-surface transition-colors"
            title="Refresh wishlist"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/shop"
            className="text-xs font-bold text-blue-600 dark:text-primary hover:underline"
          >
            Continue Shopping
          </Link>
        </div>
      </div>

        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
                <Store size={12} /> {group.label}
                {group.items.length > 1 && (
                  <button
                    onClick={() => addAllToCart(group)}
                    disabled={!!addingAllGroupKey || !!movingId}
                    className="ml-auto flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                  >
                    {addingAllGroupKey === group.label ? <Loader2 size={10} className="animate-spin" /> : <ShoppingCart size={10} />}
                    Add All
                  </button>
                )}
              </div>
              <AnimatePresence mode="popLayout">
                {group.items.map((item, idx) => {
                  const product = item.shopping_products;
                  const price = (item.variant_id && item.fashion_variants?.price_paise != null)
                    ? item.fashion_variants.price_paise
                    : item.is_platform_item 
                      ? (product?.platform_price_paise ?? product?.suggested_retail_price_paise)
                      : (item.merchant_inventory?.retail_price_paise || product?.suggested_retail_price_paise);
                  
                  const isOOS = item.variant_id && item.fashion_variants
                    ? (item.fashion_variants.inventory_quantity ?? 0) <= 0
                    : item.is_platform_item 
                      ? isPlatformProductOOS(product)
                      : isInventoryRowOOS(item.merchant_inventory);

                  const displayImg = item.fashion_variants?.fashion_variant_media?.[0]?.image_url || product?.product_images?.[0];

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 30, height: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex gap-4 p-4 rounded-2xl mb-3 bg-white dark:bg-surface-container-lowest border border-slate-200 dark:border-outline-variant/30 shadow-sm"
                    >
                      <Link
                        href={`/shop/product/${product?.slug || product?.id || ''}`}
                        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-surface-container-low shrink-0 overflow-hidden flex items-center justify-center p-2 border border-outline-variant/20 hover:border-primary/40 transition-colors"
                      >
                        {displayImg ? (
                          <img
                            src={displayImg}
                            alt={product?.title || 'Product'}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package size={22} className="text-on-surface-variant/40" />
                        )}
                        {isOOS && <OutOfStockOverlay />}
                      </Link>

                      <div className={`flex-1 min-w-0 ${isOOS ? 'opacity-50' : ''}`}>
                        <p className="text-[10px] uppercase tracking-wider font-extrabold mb-1 text-primary">{product?.category || 'General'}</p>
                        <Link href={`/shop/product/${product?.slug || product?.id || ''}`} className="hover:text-primary transition-colors">
                          <h3 className="text-sm sm:text-base font-extrabold line-clamp-2 leading-snug text-on-surface">{product?.title}</h3>
                        </Link>
                        {item.variant_id && item.fashion_variants && (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-on-surface-variant">
                            {item.fashion_variants.color && <span>{item.fashion_variants.color}</span>}
                            {item.fashion_variants.color && item.fashion_variants.size && <span>•</span>}
                            {item.fashion_variants.size && <span>Size {item.fashion_variants.size}</span>}
                          </div>
                        )}
                        {price && <p className="text-sm sm:text-base font-black mt-1.5 text-on-surface">₹{(price / 100).toLocaleString('en-IN')}</p>}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0 items-end">
                        {isOOS ? (
                          <div className="flex flex-col items-center">
                            <OutOfStockBadge variant="soft" size="sm" />
                          </div>
                        ) : (
                          <button
                            onClick={() => moveToCart(item)}
                            disabled={!!movingId}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-xs"
                          >
                            {movingId === item.id ? <Loader2 size={13} className="animate-spin" /> : <ShoppingCart size={13} />}
                            <span>Add to Cart</span>
                          </button>
                        )}
                        <button
                          onClick={() => removeFromWishlist(item.id)}
                          disabled={!!removingId}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 bg-surface-container-low hover:bg-rose-500/10 text-on-surface-variant hover:text-rose-600 border border-outline-variant/20"
                        >
                          {removingId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          <span>Remove</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))}
        </div>

      <ConfirmModal
        isOpen={confirmModalOpen}
        onConfirm={handleConfirmClearCart}
        onCancel={handleCancelClearCart}
        title="Different Store"
        message="Your cart contains items from another store. Clear cart to add this item?"
        confirmLabel="Clear & Add"
        cancelLabel="Cancel"
      />
    </div>
  );
}
