'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Truck, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ProductSummary, ProductVariant } from '../../lib/fashion/products';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';

interface FashionProductClientProps {
  product: ProductSummary;
}

export default function FashionProductClient({ product }: FashionProductClientProps) {
  const router = useRouter();
  const { user, profile } = useAuth() as any;
  const activeCustomer = profile || user;
  
  // Available unique attributes
  const colors = Array.from(new Set(product.variants.filter(v => v.color).map(v => v.color)));
  const allSizes = Array.from(new Set(product.variants.filter(v => v.size).map(v => v.size)));
  
  const [selectedColor, setSelectedColor] = useState(colors[0] || '');
  const [selectedSize, setSelectedSize] = useState('');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const currentVariant = product.variants.find(v => v.color === selectedColor && v.size === selectedSize) 
                      || product.variants.find(v => v.color === selectedColor) 
                      || product.variants[0];

  const mainImage = currentVariant?.media[0]?.image_url || '/placeholder.jpg';
  const otherImages = currentVariant?.media.slice(1) || [];

  const handleAddToCart = async () => {
    if (!selectedSize) {
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
        p_variant_id: currentVariant.id,
        p_quantity: 1,
        p_is_platform: true
      });

      if (error) throw error;
      
      if (data && !data.success) {
        throw new Error(data.message || 'Failed to add to cart');
      }

      toast.success('Added to cart!');
      window.dispatchEvent(new Event('cartUpdated')); // Trigger global cart refresh
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  React.useEffect(() => {
    if (activeCustomer && currentVariant?.id) {
      supabase.from('user_wishlists')
        .select('id')
        .eq('user_id', activeCustomer.id)
        .eq('product_id', product.id)
        .eq('variant_id', currentVariant.id)
        .maybeSingle()
        .then(({ data }) => setIsWishlisted(!!data));
    } else {
      setIsWishlisted(false);
    }
  }, [activeCustomer, product.id, currentVariant?.id]);

  const handleToggleWishlist = async () => {
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
          .eq('variant_id', currentVariant.id);
          
        if (error) throw error;
        setIsWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        const { error } = await supabase.from('user_wishlists').insert({
          user_id: activeCustomer.id,
          product_id: product.id,
          variant_id: currentVariant.id,
          is_platform_item: true
        });
        
        if (error) throw error;
        setIsWishlisted(true);
        toast.success('Saved to wishlist! ♥');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Could not update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
  };

  const price = currentVariant?.price_paise || product.base_price_paise;
  const mrp = currentVariant?.compare_at_price_paise;
  const discount = mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const isOOS = !currentVariant || currentVariant.inventory_quantity <= 0;

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#080a10] font-[family-name:var(--font-outfit)] pb-24 md:pb-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Fashion
        </button>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
        {/* Images Gallery */}
        <div className="w-full lg:w-[60%] flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative w-full aspect-[3/4] bg-slate-100 dark:bg-slate-900 md:col-span-2 overflow-hidden">
              <Image src={mainImage} alt={product.title} fill className="object-cover" priority sizes="(max-width: 1024px) 100vw, 60vw" />
              {isOOS && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-white/95 text-slate-900 text-xs font-black uppercase tracking-widest px-6 py-3 shadow-lg">OUT OF STOCK</span>
                </div>
              )}
            </div>
            {otherImages.map((media, i) => (
              <div key={i} className="relative w-full aspect-[3/4] bg-slate-100 dark:bg-slate-900 overflow-hidden hidden md:block">
                <Image src={media.image_url} alt={`${product.title} view ${i+2}`} fill className="object-cover" sizes="(max-width: 1024px) 0vw, 30vw" />
              </div>
            ))}
          </div>
          {/* Mobile horizontal scroll for other images */}
          {otherImages.length > 0 && (
            <div className="flex md:hidden gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {otherImages.map((media, i) => (
                <div key={i} className="relative w-2/3 flex-shrink-0 aspect-[3/4] bg-slate-100 dark:bg-slate-900 overflow-hidden snap-center">
                  <Image src={media.image_url} alt={`${product.title} view ${i+2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details (Sticky on Desktop) */}
        <div className="w-full lg:w-[40%] flex flex-col">
          <div className="sticky top-28">
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-none mb-4 tracking-tight">
              {product.title}
            </h1>
            
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-2xl font-medium text-slate-900 dark:text-white">{formatPrice(price)}</span>
              {mrp && <span className="text-lg text-slate-500 line-through font-medium">{formatPrice(mrp)}</span>}
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

          {/* Desktop Actions */}
          <div className="hidden md:flex gap-4 mb-10">
            <button
              onClick={handleAddToCart}
              disabled={isAdding || isOOS}
              className={`flex-1 h-14 flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest transition-all ${isOOS ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-200 shadow-xl'}`}
            >
              {isAdding ? <span className="animate-pulse">Adding...</span> : <><ShoppingBag size={18} /> Add to Cart</>}
            </button>
            <button
              onClick={handleToggleWishlist}
              disabled={wishlistLoading}
              aria-pressed={isWishlisted}
              className={`w-14 h-14 border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-colors ${isWishlisted ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-900' : 'hover:border-slate-900 dark:hover:border-white'} ${wishlistLoading ? 'opacity-50 cursor-wait' : ''}`}
            >
              <Heart size={20} strokeWidth={2} className={isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-900 dark:text-white'} />
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
    </div>
      {/* Sticky Mobile Purchase Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-[#080a10]/90 backdrop-blur-md border-t border-slate-200 dark:border-white/10 md:hidden z-50 flex items-center gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col flex-shrink-0">
          <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{formatPrice(price)}</span>
          {mrp && <span className="text-xs text-slate-500 line-through leading-tight">{formatPrice(mrp)}</span>}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isAdding || isOOS}
          className={`flex-1 h-12 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${isOOS ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-200'}`}
        >
          {isAdding ? 'Adding...' : 'Add to Cart'}
        </button>
        <button
          onClick={handleToggleWishlist}
          disabled={wishlistLoading}
          className={`w-12 h-12 border border-slate-200 dark:border-slate-800 flex items-center justify-center flex-shrink-0 transition-colors ${isWishlisted ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200' : ''}`}
        >
          <Heart size={18} strokeWidth={2} className={isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-900 dark:text-white'} />
        </button>
      </div>
    </div>
  );
}
