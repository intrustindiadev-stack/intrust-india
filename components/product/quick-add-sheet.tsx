'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import Image from 'next/image';
import type { ProductSummary, ProductVariant } from '../../lib/fashion/products';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductSummary | null;
  initialVariant: ProductVariant | null;
}

export default function QuickAddSheet({ isOpen, onClose, product, initialVariant }: QuickAddSheetProps) {
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

  const handleAdd = () => {
    if (!selectedSize) return;
    setIsAdding(true);
    // Simulate network request
    setTimeout(() => {
      setIsAdding(false);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 800);
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
            className="fixed bottom-0 inset-x-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto md:w-full md:max-w-lg bg-[var(--fashion-color-bg)] rounded-t-2xl md:rounded-2xl shadow-2xl z-[110] p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-title"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 id="quick-add-title" className="text-xl font-bold text-[var(--fashion-color-text)]">
                Add to Cart
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-[var(--fashion-color-surface)] rounded-full transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-4 mb-6">
              <div className="relative w-24 h-32 bg-[var(--fashion-color-surface-muted)] rounded-md overflow-hidden flex-shrink-0">
                <Image src={mainImage} alt={product.title} fill className="object-cover" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--fashion-color-text)] text-lg">{product.title}</h3>
                <p className="text-[var(--fashion-color-text-muted)]">{initialVariant.color}</p>
                <p className="font-medium mt-2">{formatPrice(initialVariant.price_paise)}</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="font-medium text-[var(--fashion-color-text)]">Select Size</span>
              </div>
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
                        py-3 font-medium border rounded-md transition-colors
                        ${!isAvailable ? 'opacity-40 cursor-not-allowed bg-[var(--fashion-color-surface-muted)] border-transparent' : 
                          selectedSize === size ? 'border-[var(--fashion-color-accent)] bg-[var(--fashion-color-accent)] text-[var(--fashion-color-accent-contrast)]' : 
                          'border-[var(--fashion-color-border)] hover:border-[var(--fashion-color-accent)] text-[var(--fashion-color-text)]'}
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
              className={`w-full py-4 font-bold rounded-md flex items-center justify-center transition-all ${
                isSuccess 
                  ? 'bg-[var(--fashion-color-success)] text-white' 
                  : !selectedSize || isAdding
                    ? 'bg-[var(--fashion-color-surface-muted)] text-[var(--fashion-color-text-muted)] cursor-not-allowed'
                    : 'bg-[var(--fashion-color-accent)] text-[var(--fashion-color-accent-contrast)] hover:opacity-90'
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
