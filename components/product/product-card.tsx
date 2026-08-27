'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ProductSummary, ProductVariant } from '../../lib/fashion/products';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface ProductCardProps {
  product: ProductSummary;
  viewMode?: 'grid' | 'editorial';
  onQuickAdd: (product: ProductSummary, variant: ProductVariant) => void;
}

export default function ProductCard({ product, viewMode = 'grid', onQuickAdd }: ProductCardProps) {
  const router = useRouter();
  const { user, profile } = useAuth() as any;
  const activeCustomer = profile || user;

  const colors = Array.from(new Set(product.variants.filter(v => v.color).map(v => v.color)));
  const [selectedColor, setSelectedColor] = useState(colors[0] || '');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
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

  React.useEffect(() => {
    if (activeCustomer && displayVariant?.id) {
      supabase.from('user_wishlists')
        .select('id')
        .eq('user_id', activeCustomer.id)
        .eq('product_id', product.id)
        .eq('variant_id', displayVariant.id)
        .maybeSingle()
        .then(({ data }) => setIsWishlisted(!!data));
    } else {
      setIsWishlisted(false);
    }
  }, [activeCustomer, product.id, displayVariant?.id]);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!activeCustomer) {
      toast.error('Please login to save items');
      router.push('/login');
      return;
    }
    
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        const { error } = await supabase.from('user_wishlists')
          .delete()
          .eq('user_id', activeCustomer.id)
          .eq('product_id', product.id)
          .eq('variant_id', displayVariant.id);
          
        if (error) throw error;
        setIsWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        const { error } = await supabase.from('user_wishlists').insert({
          user_id: activeCustomer.id,
          product_id: product.id,
          variant_id: displayVariant.id,
          is_platform_item: true
        });
        
        if (error) throw error;
        setIsWishlisted(true);
        toast.success('Saved to wishlist! ♥');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Could not update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!displayVariant || isOOS) return;
    setJustAdded(true);
    onQuickAdd(product, displayVariant);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <div
      className="group relative flex flex-col h-full bg-transparent"
      onMouseEnter={() => {}}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-[3/4] bg-slate-100 dark:bg-slate-900 overflow-hidden rounded-none sm:rounded-md mb-3">
        <Link href={`/shop/fashion/product/${product.id}`} className="block w-full h-full cursor-pointer">
          <Image
            src={mainImage}
            alt={product.title}
            fill
            className={`object-cover transition-opacity duration-700 ease-in-out ${hoverImage ? 'group-hover:opacity-0' : ''}`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {hoverImage && (
            <Image
              src={hoverImage}
              alt={`${product.title} secondary`}
              fill
              className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
          {discount > 0 && (
            <span className="bg-white/95 dark:bg-black/90 text-slate-900 dark:text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 shadow-sm">
              Sale {discount}%
            </span>
          )}
          {isOOS && (
            <span className="bg-slate-900/90 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 shadow-sm">
              Sold Out
            </span>
          )}
        </div>

        {/* Wishlist Toggle */}
        <button
          onClick={handleWishlist}
          disabled={wishlistLoading}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
            isWishlisted 
              ? 'bg-white dark:bg-slate-800 shadow-sm opacity-100' 
              : 'bg-transparent hover:bg-white/90 dark:hover:bg-slate-800/90 opacity-0 group-hover:opacity-100'
          } ${wishlistLoading ? 'cursor-wait' : 'cursor-pointer'}`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={16} strokeWidth={2} className={isWishlisted ? 'fill-slate-900 text-slate-900 dark:fill-white dark:text-white' : 'text-slate-900 dark:text-white drop-shadow-md'} />
        </button>

        {/* Quick Add Overlay */}
        {!isOOS && (
          <div className="absolute bottom-0 inset-x-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-10 hidden sm:block">
            <button
              onClick={handleQuickAdd}
              className="w-full py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white text-[11px] font-bold uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors shadow-lg"
            >
              {justAdded ? 'Added ✓' : 'Quick Add'}
            </button>
          </div>
        )}
      </div>

      {/* Details Container */}
      <div className="flex flex-col flex-1 px-1">
        <Link href={`/shop/fashion/product/${product.id}`} className="group-hover:opacity-80 transition-opacity">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight mb-1 line-clamp-1">
            {product.title}
          </h3>
        </Link>

        {/* Price Hierarchy */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatPrice(price)}</span>
          {mrp && (
            <span className="text-xs text-slate-500 line-through font-medium">{formatPrice(mrp)}</span>
          )}
        </div>

        {/* Swatches (If multiple colors) */}
        {colors.length > 1 && (
          <div className="flex gap-2 mt-auto pt-1 pb-1">
            {colors.slice(0, 5).map(color => {
              const isSelected = selectedColor === color;
              return (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Select color ${color}`}
                  aria-pressed={isSelected}
                  className={`w-6 h-6 rounded-full flex items-center justify-center p-[2px] transition-all focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-slate-400 ${isSelected ? 'ring-1 ring-slate-400 dark:ring-slate-500 border-transparent' : 'border border-transparent hover:border-slate-300'}`}
                >
                  <span 
                    className="w-full h-full rounded-full border border-slate-200 dark:border-white/10"
                    style={{ backgroundColor: color.toLowerCase() }}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile Quick Add (visible only on mobile touch devices) */}
        {!isOOS && (
          <button
            onClick={handleQuickAdd}
            className="sm:hidden mt-3 w-full py-2.5 border border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-widest text-slate-900 dark:text-white"
          >
            {justAdded ? 'Added ✓' : '+ Quick Add'}
          </button>
        )}
      </div>
    </div>
  );
}
