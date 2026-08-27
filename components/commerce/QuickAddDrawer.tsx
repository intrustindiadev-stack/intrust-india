'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Check, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface QuickAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  initialVariant?: any | null;
}

export default function QuickAddDrawer({
  isOpen,
  onClose,
  product,
  initialVariant
}: QuickAddDrawerProps) {
  const router = useRouter();
  const { user, profile } = useAuth() as any;
  const activeCustomer = profile || user;

  const variants = product?.variants || [];
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      const color = initialVariant?.color || product.variants?.[0]?.color || '';
      setSelectedColor(color);
      setSelectedSize('');
      setIsSuccess(false);
    }
  }, [isOpen, product, initialVariant]);

  if (!product) return null;

  const colorVariants = variants.filter((v: any) => v.color === selectedColor);
  const currentVariant = colorVariants.find((v: any) => v.size === selectedSize) || colorVariants[0] || initialVariant || variants[0];

  const allColors = Array.from(new Set(variants.filter((v: any) => v.color).map((v: any) => v.color))) as string[];
  const sizesForColor = colorVariants.map((v: any) => ({
    size: v.size,
    isAvailable: (v.inventory_quantity ?? 0) > 0,
    variantId: v.id
  }));

  const mainImage = currentVariant?.media?.[0]?.image_url || product.thumbnail || product.product_images?.[0] || '/placeholder.jpg';

  const pricePaise = currentVariant?.price_paise || product.suggested_retail_price_paise || product.price * 100 || 0;
  const mrpPaise = currentVariant?.compare_at_price_paise || product.mrp_paise || null;
  const price = pricePaise / 100;
  const mrp = mrpPaise ? mrpPaise / 100 : null;
  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const handleAdd = async () => {
    if (sizesForColor.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }

    if (!activeCustomer) {
      toast.error('Please login to continue');
      router.push('/login');
      return;
    }

    setIsAdding(true);
    try {
      const { data, error } = await supabase.rpc('add_to_shopping_cart', {
        p_customer_id: activeCustomer.id,
        p_inventory_id: null,
        p_product_id: product.id,
        p_variant_id: currentVariant?.id || null,
        p_quantity: 1,
        p_is_platform: true
      });

      if (error) throw error;
      if (data && !data.success) {
        throw new Error(data.message || 'Failed to add to cart');
      }

      setIsSuccess(true);
      window.dispatchEvent(new Event('cartUpdated'));
      toast.success('Added to cart!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Quick Add drawer error:', err);
      toast.error(err.message || 'Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

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
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />

          {/* Drawer / Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-auto sm:w-[440px] max-h-[90vh] bg-white dark:bg-gray-900 z-[101] rounded-3xl shadow-2xl border border-slate-100 dark:border-gray-800 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-gray-800">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Quick Add
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto flex-1">
              {/* Product Preview */}
              <div className="flex gap-4 mb-6">
                <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-slate-50 dark:bg-gray-800 shrink-0 border border-slate-100 dark:border-gray-700">
                  <Image
                    src={mainImage}
                    alt={product.title || 'Product'}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug mb-1">
                    {product.title || product.name}
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    {mrp && mrp > price && (
                      <span className="text-xs text-slate-400 line-through font-semibold">
                        ₹{mrp.toLocaleString('en-IN')}
                      </span>
                    )}
                    {discount > 0 && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                        {discount}% OFF
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Color Selector (if available) */}
              {allColors.length > 1 && (
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Color: <span className="text-slate-900 dark:text-white capitalize">{selectedColor}</span>
                  </p>
                  <div className="flex gap-2">
                    {allColors.map(color => {
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setSelectedColor(color);
                            setSelectedSize('');
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: color.toLowerCase() }}
                          />
                          <span className="capitalize">{color}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector (if available) */}
              {sizesForColor.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Select Size
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {sizesForColor.map(({ size, isAvailable }) => {
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSize(size)}
                          className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                            !isAvailable
                              ? 'opacity-40 line-through border-dashed border-slate-200 dark:border-gray-800 text-slate-400 cursor-not-allowed bg-slate-50 dark:bg-gray-800/40'
                              : isSelected
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md'
                              : 'bg-white dark:bg-gray-800 text-slate-800 dark:text-gray-200 border-slate-200 dark:border-gray-700 hover:border-slate-400'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* CTA Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40">
              <button
                type="button"
                onClick={handleAdd}
                disabled={isAdding || (sizesForColor.length > 0 && !selectedSize)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
              >
                {isSuccess ? (
                  <>
                    <Check size={18} className="text-emerald-300" /> Added to Cart!
                  </>
                ) : isAdding ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Adding...
                  </>
                ) : (
                  <>
                    <ShoppingBag size={18} /> Add to Cart — ₹{price.toLocaleString('en-IN')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
