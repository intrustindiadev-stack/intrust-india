'use client';
import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Heart, ShoppingCart, Trash2, Package, Loader2, Store, ArrowLeft, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { isPlatformProductOOS, isInventoryRowOOS } from '@/lib/shopping/stock';
import OutOfStockBadge from '@/components/ui/OutOfStockBadge';
import OutOfStockOverlay from '@/components/ui/OutOfStockOverlay';
import NotifyMeButton from '@/components/ui/NotifyMeButton';
import CustomerBreadcrumbs from '@/components/common/CustomerBreadcrumbs';

export default function WishlistClient({ userId, userEmail, initialItems }) {
  const [items, setItems] = useState(initialItems);
  const [movingId, setMovingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingWishlistItem, setPendingWishlistItem] = useState(null);
  const [addingAllGroupKey, setAddingAllGroupKey] = useState(null);
  const [pendingGroup, setPendingGroup] = useState(null);
  const router = useRouter();

  // Group by merchant
  const grouped = useMemo(() => {
    const groups = {};
    for (const item of items) {
      const key = item.is_platform_item ? 'intrust-official' : (item.merchants?.id || 'unknown');
      const label = item.is_platform_item ? 'InTrust Official' : (item.merchants?.business_name || 'Unknown Store');
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
    const isOOS = item.is_platform_item 
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
          <Link href="/shop" className="inline-flex items-center justify-center w-full gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs">
            Explore Shop Catalog
          </Link>
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

        <Link
          href="/shop"
          className="text-xs font-bold text-blue-600 dark:text-primary hover:underline"
        >
          Continue Shopping
        </Link>
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
                  const price = item.is_platform_item 
                    ? (product?.platform_price_paise ?? product?.suggested_retail_price_paise)
                    : (item.merchant_inventory?.retail_price_paise || product?.suggested_retail_price_paise);
                  
                  const isOOS = item.is_platform_item 
                    ? isPlatformProductOOS(product)
                    : isInventoryRowOOS(item.merchant_inventory);

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
                      <Link href={`/shop/product/${product?.slug}`} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50 dark:bg-surface-container-low border border-slate-200 dark:border-outline-variant/20 relative">
                        {product?.product_images?.[0] ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={product.product_images[0]}
                              alt={product.title}
                              fill
                              sizes="(max-width: 640px) 20vw, 64px"
                              className="object-contain"
                              quality={60}
                            />
                          </div>
                        ) : (
                          <Package size={20} className="text-slate-200" />
                        )}
                        {isOOS && <OutOfStockOverlay />}
                      </Link>

                      <div className={`flex-1 min-w-0 ${isOOS ? 'opacity-50' : ''}`}>
                        <p className="text-[9px] uppercase tracking-widest font-black mb-0.5 text-slate-400">{product?.category || 'General'}</p>
                        <h3 className="text-sm font-bold line-clamp-2 leading-tight text-slate-900 dark:text-on-surface">{product?.title}</h3>
                        {price && <p className="text-sm font-black mt-1 text-slate-900 dark:text-on-surface">₹{(price / 100).toLocaleString('en-IN')}</p>}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        {isOOS ? (
                          <div className="flex flex-col gap-2 items-center">
                            <OutOfStockBadge variant="soft" size="sm" />
                            <NotifyMeButton 
                              productId={product?.id} 
                              inventoryId={item.inventory_id}
                              email={userEmail}
                              variant="outline"
                              className="h-8"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => moveToCart(item)}
                            disabled={!!movingId}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-xs"
                          >
                            {movingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <ShoppingCart size={12} />}
                            Add to Cart
                          </button>
                        )}
                        <button
                          onClick={() => removeFromWishlist(item.id)}
                          disabled={!!removingId}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 bg-slate-100 hover:bg-rose-50 dark:bg-surface-container-low dark:hover:bg-rose-500/10 text-slate-500 dark:text-brand-steel hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          {removingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Remove
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
