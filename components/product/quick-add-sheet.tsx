'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import Image from 'next/image';
import type { ProductSummary, ProductVariant } from '../../lib/fashion/products';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductSummary | null;
  initialVariant: ProductVariant | null;
}

export default function QuickAddSheet({ isOpen, onClose, product, initialVariant }: QuickAddSheetProps) {
  const router = useRouter();
  const { user, profile } = useAuth() as any;
  const activeCustomer = profile || user;

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset state when opened
  React.useEffect(() => {
    if (isOpen) {
      setSelectedSize('');
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!product || !initialVariant) return null;

  const colorVariants = product.variants.filter(v => v.color === initialVariant.color);
  const allSizes = Array.from(new Set(product.variants.map(v => v.size)));

  const handleAdd = async () => {
    if (!selectedSize || !product) return;
    
    if (!activeCustomer) {
      toast.error('Please login to continue');
      router.push('/login');
      return;
    }

    const variantToAdd = colorVariants.find(v => v.size === selectedSize) || initialVariant;

    setIsAdding(true);
    try {
      const { data, error } = await supabase.rpc('add_to_shopping_cart', {
        p_customer_id: activeCustomer.id,
        p_inventory_id: null,
        p_product_id: product.id,
        p_variant_id: variantToAdd.id,
        p_quantity: 1,
        p_is_platform: true
      });

      if (error) throw error;
      if (data && !data.success) {
        throw new Error(data.message || 'Failed to add to cart');
      }

      setIsSuccess(true);
      window.dispatchEvent(new Event('cartUpdated')); // Global cart refresh event
      toast.success('Added to cart!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const mainImage = initialVariant.media[0]?.image_url || '/placeholder.jpg';

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 inset-x-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto md:w-full md:max-w-md bg-white dark:bg-[#0c0e16] rounded-t-2xl md:rounded-none shadow-2xl z-[110] p-6 border border-slate-100 dark:border-white/5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-title"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 id="quick-add-title" className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">
                Quick Add
              </h2>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-white"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-4 mb-8">
              <div className="relative w-24 h-32 bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0">
                <Image src={mainImage} alt={product.title} fill className="object-cover" />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-tight mb-1">{product.title}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest">{initialVariant.color}</p>
                <p className="font-black text-slate-900 dark:text-white mt-3">{formatPrice(initialVariant.price_paise)}</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="grid grid-cols-4 gap-2">
                {allSizes.map(size => {
                  const variantForSize = colorVariants.find(v => v.size === size);
                  const isAvailable = variantForSize && variantForSize.inventory_quantity > 0;
                  return (
                    <button
                      key={size}
                      disabled={!isAvailable}
                      onClick={() => setSelectedSize(size)}
                      className={`
                        py-3 text-xs font-bold transition-colors border
                        ${!isAvailable ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-400' : 
                          selectedSize === size ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 
                          'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-900 dark:hover:border-white'}
                      `}
                      aria-label={`Size ${size} ${!isAvailable ? '(Out of stock)' : ''}`}
                      aria-pressed={selectedSize === size}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={!selectedSize || isAdding || isSuccess}
              className={`w-full py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center transition-all shadow-lg ${
                isSuccess 
                  ? 'bg-emerald-500 text-white' 
                  : !selectedSize || isAdding
                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-200'
              }`}
            >
              {isAdding ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isSuccess ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Added to Cart
                </>
              ) : (
                'Add to Cart'
              )}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
