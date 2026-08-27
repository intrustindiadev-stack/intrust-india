'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ProductSummary, ProductVariant } from '../../lib/fashion/products';

interface ProductCardProps {
  product: ProductSummary;
  viewMode?: 'grid' | 'editorial';
  onQuickAdd: (product: ProductSummary, variant: ProductVariant) => void;
}

export default function ProductCard({ product, viewMode = 'grid', onQuickAdd }: ProductCardProps) {
  const colors = Array.from(new Set(product.variants.filter(v => v.color).map(v => v.color)));
  const [selectedColor, setSelectedColor] = useState(colors[0] || '');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const displayVariant = product.variants.find(v => v.color === selectedColor) || product.variants[0];
  const mainImage = displayVariant?.media[0]?.image_url || '/placeholder.jpg';
  const hoverImage = displayVariant?.media[1]?.image_url;
  const colorVariants = product.variants.filter(v => v.color === selectedColor);
  const availableSizes = colorVariants.filter(v => v.inventory_quantity > 0).map(v => v.size);

  const formatPrice = (paise: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

  const price = displayVariant?.price_paise || product.base_price_paise;
  const mrp = displayVariant?.compare_at_price_paise;
  const discount = mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const isOOS = !displayVariant || displayVariant.inventory_quantity <= 0;

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsWishlisted(w => !w);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!displayVariant || isOOS) return;
    setJustAdded(true);
    onQuickAdd(product, displayVariant);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group relative flex flex-col h-full rounded-2xl bg-white dark:bg-[#0c0e16] border border-slate-100 dark:border-white/[0.04] shadow-[0_4px_20px_rgb(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden"
    >
      {/* Image */}
      <div className="relative w-full aspect-[3/4] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <Link href={`/shop/fashion/product/${product.id}`} className="block w-full h-full">
          <Image
            src={mainImage}
            alt={product.title}
            fill
            className={`object-cover transition-opacity duration-500 ${hoverImage ? 'group-hover:opacity-0' : ''}`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {hoverImage && (
            <Image
              src={hoverImage}
              alt={product.title}
              fill
              className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}
        </Link>

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
            -{discount}%
          </span>
        )}
        {isOOS && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white/90 text-slate-800 text-xs font-black px-3 py-1.5 rounded-full">OUT OF STOCK</span>
          </div>
        )}

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white dark:hover:bg-black/70 transition-colors"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={14} className={isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600 dark:text-slate-300'} />
        </button>

        {/* Quick Add */}
        {!isOOS && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-0 inset-x-0 py-3 bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-2"
          >
            {justAdded ? (
              <span className="text-emerald-400 dark:text-emerald-600">Added ✓</span>
            ) : (
              <><ShoppingCart size={13} /> Quick Add</>
            )}
          </button>
        )}
      </div>

      {/* Details */}
      <div className="p-3 flex-1 flex flex-col">
        <Link href={`/shop/fashion/product/${product.id}`}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug mb-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {product.title}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-2">
          <span className="text-sm font-black text-slate-900 dark:text-white">{formatPrice(price)}</span>
          {mrp && (
            <span className="text-xs text-slate-400 line-through">{formatPrice(mrp)}</span>
          )}
        </div>

        {/* Color Swatches */}
        {colors.length > 1 && (
          <div className="flex gap-1.5 mt-2">
            {colors.slice(0, 5).map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                title={color}
                className={`w-4 h-4 rounded-full border-2 transition-transform ${selectedColor === color ? 'border-blue-500 scale-110' : 'border-slate-300 dark:border-slate-600'}`}
                style={{ backgroundColor: color.toLowerCase() }}
              />
            ))}
          </div>
        )}

        {/* Sizes */}
        {availableSizes.length > 0 && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
            {availableSizes.slice(0, 4).join(' · ')}
          </p>
        )}
      </div>
    </motion.div>
  );
}
