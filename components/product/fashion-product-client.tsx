'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ShoppingBag,
  Truck,
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Check,
  Zap,
  Star,
  PackageCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ProductSummary, ProductVariant } from '../../lib/fashion/products';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import ProductCard from '../commerce/ProductCard';

interface FashionProductClientProps {
  product: ProductSummary;
  similarProducts?: any[];
}

export default function FashionProductClient({
  product,
  similarProducts = []
}: FashionProductClientProps) {
  const router = useRouter();
  const { user, profile } = useAuth() as any;
  const activeCustomer = profile || user;

  // Extract unique colors & sizes
  const colors = useMemo(() => {
    return Array.from(new Set(product.variants.filter(v => v.color).map(v => v.color)));
  }, [product.variants]);

  const allSizes = useMemo(() => {
    return Array.from(new Set(product.variants.filter(v => v.size).map(v => v.size)));
  }, [product.variants]);

  const [selectedColor, setSelectedColor] = useState<string>(colors[0] || '');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>('details');

  // Find active variant based on selected color and size
  const colorVariants = useMemo(() => {
    return product.variants.filter(v => v.color === selectedColor);
  }, [product.variants, selectedColor]);

  const currentVariant = useMemo(() => {
    return colorVariants.find(v => v.size === selectedSize)
      || colorVariants[0]
      || product.variants[0];
  }, [colorVariants, selectedSize, product.variants]);

  // Extract all media for current color variant
  const mediaList = useMemo(() => {
    if (currentVariant?.media && currentVariant.media.length > 0) {
      return currentVariant.media;
    }
    return [{ image_url: '/placeholder.jpg', alt_text: product.title }];
  }, [currentVariant, product.title]);

  const activeImage = mediaList[selectedImageIdx] || mediaList[0];

  // Pricing calculations
  const pricePaise = currentVariant?.price_paise || product.base_price_paise || 0;
  const mrpPaise = currentVariant?.compare_at_price_paise || null;
  const price = pricePaise / 100;
  const mrp = mrpPaise ? mrpPaise / 100 : null;
  const savings = mrp && mrp > price ? mrp - price : 0;
  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const isOOS = !currentVariant || (currentVariant.inventory_quantity ?? 0) <= 0;

  // Sync wishlist
  React.useEffect(() => {
    if (activeCustomer && currentVariant?.id) {
      supabase.from('user_wishlists')
        .select('id')
        .eq('user_id', activeCustomer.id)
        .eq('product_id', product.id)
        .eq('variant_id', currentVariant.id)
        .maybeSingle()
        .then(({ data }) => setIsWishlisted(Boolean(data)));
    } else {
      setIsWishlisted(false);
    }
  }, [activeCustomer, product.id, currentVariant?.id]);

  // Wishlist handler
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
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Could not update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  // Add to cart handler
  const handleAddToCart = async (directCheckout = false) => {
    if (allSizes.length > 0 && !selectedSize) {
      toast.error('Please select a size');
      return;
    }

    if (!activeCustomer) {
      toast.error('Please login to continue');
      router.push('/login');
      return;
    }

    if (directCheckout) {
      setIsBuyingNow(true);
    } else {
      setIsAdding(true);
    }

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

      window.dispatchEvent(new Event('cartUpdated'));

      if (directCheckout) {
        router.push('/shop/cart');
      } else {
        toast.success('Added to cart!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to add to cart');
    } finally {
      setIsAdding(false);
      setIsBuyingNow(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#080a10] font-[family-name:var(--font-outfit)] pb-28 md:pb-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Breadcrumb & Back ── */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/shop" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Shop
            </Link>
            <span>/</span>
            <Link href="/shop/fashion" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Fashion
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
              {product.title}
            </span>
          </nav>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        {/* ── Main Product Grid ── */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">

          {/* ── LEFT: Interactive Gallery ── */}
          <div className="w-full lg:w-[58%] flex flex-col-reverse md:flex-row gap-4">
            
            {/* Thumbnails list (Desktop Vertical, Mobile Horizontal) */}
            {mediaList.length > 1 && (
              <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar shrink-0 md:w-20 lg:w-24">
                {mediaList.map((media, idx) => {
                  const isSelected = idx === selectedImageIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`relative aspect-[3/4] w-16 md:w-full rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-gray-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={media.image_url}
                        alt={`${product.title} thumb ${idx + 1}`}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Primary Viewport */}
            <div className="relative flex-1 aspect-[3/4] rounded-3xl bg-slate-50 dark:bg-gray-900 overflow-hidden border border-slate-100 dark:border-gray-800 shadow-sm">
              <Image
                src={activeImage.image_url}
                alt={product.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />

              {discount > 0 && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-rose-600 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    {discount}% OFF
                  </span>
                </div>
              )}

              {isOOS && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-10">
                  <span className="bg-white dark:bg-gray-900 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-2xl shadow-xl">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Product Info & Purchase Controls ── */}
          <div className="w-full lg:w-[42%] flex flex-col">
            <div className="sticky top-24">

              {/* Title & Brand */}
              <div className="mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2 inline-block">
                  Intrust Fashion
                </span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                  {product.title}
                </h1>
              </div>

              {/* Price Display */}
              <div className="flex items-baseline gap-3 mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-100 dark:border-gray-800">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                {mrp && mrp > price && (
                  <>
                    <span className="text-lg text-slate-400 line-through font-semibold">
                      ₹{mrp.toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      Save ₹{savings.toLocaleString('en-IN')} ({discount}%)
                    </span>
                  </>
                )}
              </div>

              {/* ── Color Swatches ── */}
              {colors.length > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Color: <strong className="text-slate-900 dark:text-white capitalize">{selectedColor}</strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {colors.map(color => {
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setSelectedColor(color);
                            setSelectedImageIdx(0);
                          }}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-bold capitalize transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-sm ring-2 ring-blue-500/20'
                              : 'border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:border-slate-400'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: color.toLowerCase() }}
                          />
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Size Selector ── */}
              {allSizes.length > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Select Size
                    </span>
                    <button type="button" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      Size Chart
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {allSizes.map(size => {
                      const variantForSize = product.variants.find(
                        v => v.color === selectedColor && v.size === size
                      );
                      const isAvailable = Boolean(variantForSize && (variantForSize.inventory_quantity ?? 0) > 0);
                      const isSelected = selectedSize === size;

                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSize(size)}
                          className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
                            !isAvailable
                              ? 'opacity-40 line-through border-dashed border-slate-200 dark:border-gray-800 text-slate-400 cursor-not-allowed bg-slate-50 dark:bg-gray-800/30'
                              : isSelected
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md scale-[1.02]'
                              : 'bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-200 border-slate-200 dark:border-gray-700 hover:border-blue-500'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Primary Action CTAs ── */}
              <div className="flex items-center gap-3 mb-8">
                <button
                  type="button"
                  onClick={() => handleAddToCart(false)}
                  disabled={isAdding || isOOS}
                  className="flex-1 py-4 bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={18} />
                  {isAdding ? 'Adding to Cart...' : 'Add to Cart'}
                </button>

                <button
                  type="button"
                  onClick={() => handleAddToCart(true)}
                  disabled={isBuyingNow || isOOS}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Zap size={18} />
                  {isBuyingNow ? 'Processing...' : 'Buy Now'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all ${
                    isWishlisted
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-500 shadow-sm'
                      : 'border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:border-slate-400'
                  }`}
                >
                  <Heart size={20} className={isWishlisted ? 'fill-rose-500 text-rose-500' : ''} />
                </button>
              </div>

              {/* ── Trust Pillars ── */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-100 dark:border-gray-800 mb-8 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <Truck size={20} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-gray-200 leading-tight">Free Delivery</span>
                  <span className="text-[10px] text-slate-400">On all prepaid orders</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 border-x border-slate-200 dark:border-gray-800 px-2">
                  <RotateCcw size={20} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-gray-200 leading-tight">7-Day Returns</span>
                  <span className="text-[10px] text-slate-400">Hassle-free exchange</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <ShieldCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[11px] font-bold text-slate-800 dark:text-gray-200 leading-tight">100% Genuine</span>
                  <span className="text-[10px] text-slate-400">Directly sourced</span>
                </div>
              </div>

              {/* ── Accordion Sections ── */}
              <div className="border-t border-slate-100 dark:border-gray-800 divide-y divide-slate-100 dark:divide-gray-800">
                
                {/* Details Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(openAccordion === 'details' ? null : 'details')}
                    className="w-full py-4 flex items-center justify-between text-left text-sm font-bold text-slate-900 dark:text-white"
                  >
                    <span>Product Details & Description</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${openAccordion === 'details' ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordion === 'details' && (
                    <div className="pb-4 text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                      {product.description || 'Crafted with premium fabrics designed for comfort, style, and everyday longevity.'}
                    </div>
                  )}
                </div>

                {/* Fabric & Care */}
                <div>
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(openAccordion === 'care' ? null : 'care')}
                    className="w-full py-4 flex items-center justify-between text-left text-sm font-bold text-slate-900 dark:text-white"
                  >
                    <span>Fabric, Material & Care</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${openAccordion === 'care' ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordion === 'care' && (
                    <div className="pb-4 text-xs text-slate-600 dark:text-gray-400 space-y-1.5">
                      <p>• <strong>Fabric:</strong> {currentVariant?.fabric || '100% Breathable Cotton'}</p>
                      <p>• <strong>Fit:</strong> {currentVariant?.fit || 'Regular / Tailored Fit'}</p>
                      <p>• <strong>Care:</strong> Machine wash cold with similar colors. Do not bleach. Tumble dry low.</p>
                    </div>
                  )}
                </div>

                {/* Delivery & Returns */}
                <div>
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(openAccordion === 'returns' ? null : 'returns')}
                    className="w-full py-4 flex items-center justify-between text-left text-sm font-bold text-slate-900 dark:text-white"
                  >
                    <span>Shipping, Delivery & Returns</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${openAccordion === 'returns' ? 'rotate-180' : ''}`} />
                  </button>
                  {openAccordion === 'returns' && (
                    <div className="pb-4 text-xs text-slate-600 dark:text-gray-400 space-y-1.5">
                      <p>• Dispatch within 24–48 hours from Intrust platform fulfillment centers.</p>
                      <p>• Free doorstep delivery across India.</p>
                      <p>• 7-day easy return and instant replacement policy.</p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>

        </div>

        {/* ── Similar Products Row ── */}
        {similarProducts.length > 0 && (
          <div className="mt-20 pt-10 border-t border-slate-100 dark:border-gray-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
              You Might Also Like
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {similarProducts.map((p, i) => (
                <ProductCard key={p.id || i} product={p} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Sticky Mobile Purchase Bar ── */}
      <div className="fixed bottom-0 inset-x-0 p-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-gray-800 md:hidden z-50 flex items-center gap-3 shadow-2xl">
        <div className="flex flex-col shrink-0 min-w-[70px]">
          <span className="text-base font-black text-slate-900 dark:text-white leading-tight">
            ₹{price.toLocaleString('en-IN')}
          </span>
          {mrp && mrp > price && (
            <span className="text-[10px] text-slate-400 line-through leading-tight font-semibold">
              ₹{mrp.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleAddToCart(false)}
          disabled={isAdding || isOOS}
          className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md"
        >
          <ShoppingBag size={14} />
          {isAdding ? 'Adding...' : 'Add to Cart'}
        </button>

        <button
          type="button"
          onClick={() => handleAddToCart(true)}
          disabled={isBuyingNow || isOOS}
          className="flex-1 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25"
        >
          <Zap size={14} />
          {isBuyingNow ? '...' : 'Buy Now'}
        </button>
      </div>

    </div>
  );
}
