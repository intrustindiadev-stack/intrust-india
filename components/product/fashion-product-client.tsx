'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Truck, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ProductSummary, ProductVariant } from '../../lib/fashion/products';
import { toast } from 'react-hot-toast';

interface FashionProductClientProps {
  product: ProductSummary;
}

export default function FashionProductClient({ product }: FashionProductClientProps) {
  const router = useRouter();
  
  // Available unique attributes
  const colors = Array.from(new Set(product.variants.filter(v => v.color).map(v => v.color)));
  const allSizes = Array.from(new Set(product.variants.filter(v => v.size).map(v => v.size)));
  
  const [selectedColor, setSelectedColor] = useState(colors[0] || '');
  const [selectedSize, setSelectedSize] = useState('');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const currentVariant = product.variants.find(v => v.color === selectedColor && v.size === selectedSize) 
                      || product.variants.find(v => v.color === selectedColor) 
                      || product.variants[0];

  const mainImage = currentVariant?.media[0]?.image_url || '/placeholder.jpg';
  const otherImages = currentVariant?.media.slice(1) || [];

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    
    setIsAdding(true);
    // TODO: Integrate with existing cart logic for variants
    setTimeout(() => {
      setIsAdding(false);
      toast.success('Added to cart!');
    }, 800);
  };

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
  };

  const price = currentVariant?.price_paise || product.base_price_paise;
  const mrp = currentVariant?.compare_at_price_paise;
  const discount = mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const isOOS = !currentVariant || currentVariant.inventory_quantity <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Fashion
      </button>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        {/* Images */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          <div className="relative w-full aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden">
            <Image src={mainImage} alt={product.title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
            {isOOS && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-white/90 text-slate-900 font-bold px-4 py-2 rounded-full">OUT OF STOCK</span>
              </div>
            )}
          </div>
          {otherImages.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {otherImages.map((media, i) => (
                <div key={i} className="relative w-24 h-32 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                  <Image src={media.image_url} alt={`${product.title} view ${i+2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="w-full md:w-1/2 flex flex-col">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-2">
            {product.title}
          </h1>
          
          <div className="flex items-end gap-3 mb-6">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{formatPrice(price)}</span>
            {mrp && <span className="text-lg text-slate-400 line-through mb-0.5">{formatPrice(mrp)}</span>}
            {discount > 0 && <span className="text-sm font-bold text-rose-500 mb-1">({discount}% OFF)</span>}
          </div>

          <div className="w-full h-px bg-slate-200 dark:bg-white/10 mb-8" />

          {/* Colors */}
          {colors.length > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">Color: <span className="font-normal text-slate-500">{selectedColor}</span></h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => { setSelectedColor(color); setSelectedSize(''); }}
                    className={`w-12 h-12 rounded-full border-2 transition-transform ${selectedColor === color ? 'border-blue-500 scale-110 shadow-md' : 'border-slate-300 dark:border-slate-600 hover:scale-105'}`}
                    style={{ backgroundColor: color.toLowerCase() }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {allSizes.length > 0 && (
            <div className="mb-10">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">Size</h3>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {allSizes.map(size => {
                  // Check if this size is available in the selected color
                  const variantForSize = product.variants.find(v => v.color === selectedColor && v.size === size);
                  const isAvailable = variantForSize && variantForSize.inventory_quantity > 0;
                  
                  return (
                    <button
                      key={size}
                      onClick={() => isAvailable && setSelectedSize(size)}
                      disabled={!isAvailable}
                      className={`
                        min-w-[3rem] h-12 px-4 rounded-xl border-2 font-semibold transition-all
                        ${!isAvailable 
                          ? 'border-slate-200 dark:border-white/5 text-slate-300 dark:text-white/20 cursor-not-allowed bg-slate-50 dark:bg-white/5' 
                          : selectedSize === size 
                            ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500'}
                      `}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 mb-10">
            <button
              onClick={handleAddToCart}
              disabled={isAdding || isOOS}
              className={`flex-1 h-14 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-wider transition-transform ${isOOS ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] active:scale-[0.98] shadow-xl'}`}
            >
              {isAdding ? <span className="animate-pulse">Adding...</span> : <><ShoppingBag size={20} /> Add to Cart</>}
            </button>
            <button
              onClick={() => setIsWishlisted(!isWishlisted)}
              className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-colors ${isWishlisted ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5'}`}
            >
              <Heart className={isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600 dark:text-slate-300'} />
            </button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-slate-400" />
              <span>Free Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-slate-400" />
              <span>100% Genuine</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
