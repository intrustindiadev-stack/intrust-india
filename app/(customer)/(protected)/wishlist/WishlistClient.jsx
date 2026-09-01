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
    let isOOS = false;
    if (item.variant_id && item.fashion_variants) {
      isOOS = (item.fashion_variants.inventory_quantity ?? 0) <= 0;
    } else if (item.is_platform_item) {
      isOOS = isPlatformProductOOS(item.shopping_products);
    } else {
      isOOS = isInventoryRowOOS(item.merchant_inventory);
    }

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
    try {
      await supabase.from('shopping_cart').delete().eq('customer_id', userId);
      if (pendingWishlistItem) {
        await moveToCart(pendingWishlistItem);
      } else if (pendingGroup) {
        await addAllToCart(pendingGroup);
      }
    } catch (err) {
      toast.error('Failed to reset cart');
    } finally {
      setPendingWishlistItem(null);
      setPendingGroup(null);
    }
  };

  const handleCancelClearCart = () => {
    setConfirmModalOpen(false);
    setPendingWishlistItem(null);
    setPendingGroup(null);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 md:pt-28 px-4 pb-12 bg-slate-50">
        <div className="max-w-7xl mx-auto mb-4">
          <button
            onClick={() => router.push('/shop')}
            className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all hover:bg-slate-100 text-slate-600 bg-white border border-gray-200 shadow-sm hover:shadow-md"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="max-w-md mx-auto text-center py-16 px-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 bg-slate-50 border border-slate-100">
            <Heart className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-slate-900">Your wishlist is empty</h2>
          <p className="text-sm mb-6 text-slate-500">Save items you love to buy them later.</p>
          <Link href="/shop" className="inline-flex items-center justify-center w-full gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-sm hover:shadow-md">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-12 px-4 sm:px-6 lg:px-8 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/shop')}
            className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all hover:bg-slate-100 text-slate-600 bg-white border border-gray-200 shadow-sm hover:shadow-md"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-slate-900 m-0">
            My Wishlist
            <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{items.length}</span>
          </h1>
        </div>

        <div className="space-y-10">
          {grouped.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-gray-200 pb-2">
                <Store size={14} /> {group.label}
                {group.items.length > 1 && (
                  <button
                    onClick={() => addAllToCart(group)}
                    disabled={!!addingAllGroupKey || !!movingId}
                    className="ml-auto flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 disabled:opacity-50 font-medium transition-all"
                  >
                    {addingAllGroupKey === group.label ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                    Add All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {group.items.map((item, idx) => {
                    const product = item.shopping_products;
                    const fVariant = item.fashion_variants;
                    const itemUrl = item.variant_id
                      ? `/shop/fashion/product/${product?.id}`
                      : `/shop/product/${product?.slug}`;

                    const displayImg = fVariant?.fashion_variant_media?.[0]?.image_url || product?.product_images?.[0];

                    const price = fVariant?.price_paise 
                      ?? (item.is_platform_item 
                        ? (product?.platform_price_paise ?? product?.suggested_retail_price_paise)
                        : (item.merchant_inventory?.retail_price_paise || product?.suggested_retail_price_paise));
                    
                    const isOOS = fVariant 
                      ? (fVariant.inventory_quantity ?? 0) <= 0 
                      : (item.is_platform_item 
                        ? isPlatformProductOOS(product)
                        : isInventoryRowOOS(item.merchant_inventory));

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex flex-col rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                      >
                        <Link href={itemUrl} className="relative aspect-square w-full bg-slate-50 border-b border-gray-100 overflow-hidden">
                          {displayImg ? (
                            <Image
                              src={displayImg}
                              alt={product?.title || 'Product'}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              className="object-cover transition-transform group-hover:scale-105"
                              quality={80}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-slate-300">
                              <Package size={32} />
                            </div>
                          )}
                          {isOOS && <OutOfStockOverlay />}
                        </Link>

                        <div className={`flex flex-col flex-1 p-4 ${isOOS ? 'opacity-50' : ''}`}>
                          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1 text-slate-400">{product?.category || 'General'}</p>
                          <Link href={itemUrl} className="hover:text-indigo-600 transition-colors">
                            <h3 className="text-sm font-medium line-clamp-2 leading-tight text-slate-800 mb-2">{product?.title}</h3>
                          </Link>
                          {fVariant && (
                            <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {fVariant.color && <span className="capitalize">{fVariant.color}</span>}
                                {fVariant.color && fVariant.size && <span> · </span>}
                                {fVariant.size && <span>Size {fVariant.size}</span>}
                              </span>
                            </div>
                          )}
                          <div className="mt-auto pt-2">
                            {price && <p className="text-lg font-semibold text-slate-900">₹{(price / 100).toLocaleString('en-IN')}</p>}
                          </div>
                        </div>

                        <div className="p-4 pt-0 flex gap-2">
                          {isOOS ? (
                            <div className="flex-1 flex flex-col gap-2 items-center">
                              <OutOfStockBadge variant="soft" size="sm" className="w-full justify-center" />
                              <NotifyMeButton 
                                productId={product?.id} 
                                inventoryId={item.inventory_id}
                                email={userEmail}
                                variant="outline"
                                className="w-full h-9"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => moveToCart(item)}
                              disabled={!!movingId}
                              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold transition-all shadow-sm hover:shadow"
                            >
                              {movingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                              Add to Cart
                            </button>
                          )}
                          <button
                            onClick={() => removeFromWishlist(item.id)}
                            disabled={!!removingId}
                            title="Remove from wishlist"
                            className="flex items-center justify-center w-11 h-11 shrink-0 rounded-xl transition-all border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50"
                          >
                            {removingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
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
