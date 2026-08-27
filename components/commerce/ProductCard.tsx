'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, Star, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export interface ProductCardData {
  id: string;
  title?: string;
  name?: string;
  brand?: string;
  description?: string;
  category?: string;
  slug?: string;
  url?: string;
  price?: number;
  mrp_paise?: number;
  suggested_retail_price_paise?: number;
  compare_at_price_paise?: number;
  product_images?: string[];
  thumbnail?: string;
  outOfStock?: boolean;
  isFashion?: boolean;
  rating?: number;
  reviewCount?: number;
  variants?: Array<{
    id: string;
    sku?: string;
    color?: string;
    size?: string;
    fit?: string;
    fabric?: string;
    price_paise?: number;
    compare_at_price_paise?: number | null;
    inventory_quantity?: number;
    media?: Array<{ image_url: string; alt_text?: string | null }>;
  }>;
}

interface ProductCardProps {
  product: ProductCardData | any;
  priority?: boolean;
  onQuickAdd?: (product: any, variant?: any) => void;
  className?: string;
}

export default function ProductCard({
  product,
  priority = false,
  onQuickAdd,
  className = ''
}: ProductCardProps) {
  const router = useRouter();
  const { user, profile } = useAuth() as any;
  const activeCustomer = profile || user;

  // 1. Determine if this is a Fashion product with variants
  const variants = product.variants || [];
  const isFashion = Boolean(
    product.isFashion ||
    variants.length > 0 ||
    product.fashion_product_categories?.length > 0
  );

  const colors = Array.from(new Set(variants.filter((v: any) => v.color).map((v: any) => v.color))) as string[];
  const [selectedColor, setSelectedColor] = useState<string>(colors[0] || '');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [imgError, setImgError] = useState(false);

  // 2. Resolve Active Variant (if fashion)
  const activeVariant = variants.find((v: any) => v.color === selectedColor) || variants[0] || null;

  // 3. Resolve Images
  const fallbackImg = '/placeholder.jpg';
  let mainImage = product.thumbnail || product.product_images?.[0] || fallbackImg;
  let hoverImage: string | null = product.product_images?.[1] || null;

  if (activeVariant?.media && activeVariant.media.length > 0) {
    mainImage = activeVariant.media[0]?.image_url || mainImage;
    hoverImage = activeVariant.media[1]?.image_url || null;
  }

  // 4. Resolve Title & Brand
  const title = product.title || product.name || 'Product';
  const brand = product.brand || product.category || '';

  // 5. Resolve Pricing (in INR)
  let salePrice: number = 0;
  let mrpPrice: number | null = null;

  if (activeVariant?.price_paise !== undefined) {
    salePrice = activeVariant.price_paise / 100;
    if (activeVariant.compare_at_price_paise) {
      mrpPrice = activeVariant.compare_at_price_paise / 100;
    }
  } else if (product.suggested_retail_price_paise !== undefined) {
    salePrice = (product.suggested_retail_price_paise || 0) / 100;
    if (product.mrp_paise) {
      mrpPrice = product.mrp_paise / 100;
    }
  } else if (product.price !== undefined) {
    salePrice = product.price;
    if (product.mrp_paise) {
      mrpPrice = product.mrp_paise / 100;
    }
  }

  // 6. Calculate Discount
  const discount = mrpPrice && mrpPrice > salePrice
    ? Math.round(((mrpPrice - salePrice) / mrpPrice) * 100)
    : 0;

  // 7. Determine Out of Stock
  let isOOS = Boolean(product.outOfStock);
  if (isFashion && activeVariant) {
    isOOS = (activeVariant.inventory_quantity ?? 0) <= 0;
  } else if (product.admin_stock !== undefined) {
    isOOS = (product.admin_stock ?? 0) <= 0;
  }

  // 8. Resolve Route
  const productUrl = product.url || (
    isFashion
      ? `/shop/fashion/product/${product.id}`
      : `/shop/product/${product.slug || product.id}`
  );

  // 9. Sync Wishlist State
  useEffect(() => {
    if (!activeCustomer?.id || !product?.id) {
      setIsWishlisted(false);
      return;
    }
    const query = supabase
      .from('user_wishlists')
      .select('id')
      .eq('user_id', activeCustomer.id)
      .eq('product_id', product.id);

    if (activeVariant?.id) {
      query.eq('variant_id', activeVariant.id);
    }

    query.maybeSingle().then(({ data }) => setIsWishlisted(Boolean(data)));
  }, [activeCustomer?.id, product.id, activeVariant?.id]);

  // 10. Handle Wishlist Toggle
  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!activeCustomer) {
      toast.error('Please login to save items');
      router.push('/login');
      return;
    }

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        let delQuery = supabase
          .from('user_wishlists')
          .delete()
          .eq('user_id', activeCustomer.id)
          .eq('product_id', product.id);

        if (activeVariant?.id) {
          delQuery = delQuery.eq('variant_id', activeVariant.id);
        }

        const { error } = await delQuery;
        if (error) throw error;
        setIsWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        const { error } = await supabase.from('user_wishlists').insert({
          user_id: activeCustomer.id,
          product_id: product.id,
          variant_id: activeVariant?.id || null,
          is_platform_item: true
        });

        if (error) throw error;
        setIsWishlisted(true);
        toast.success('Saved to wishlist! ♥');
      }
    } catch (err: any) {
      console.error('Wishlist error:', err);
      toast.error(err.message || 'Could not update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  // 11. Handle Quick Add
  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOOS) return;

    // If parent supplied a custom onQuickAdd (e.g. to open size picker for fashion)
    if (isFashion && onQuickAdd) {
      onQuickAdd(product, activeVariant);
      return;
    }

    // For standard product direct quick-add
    if (!activeCustomer) {
      toast.error('Please login to add to cart');
      router.push('/login');
      return;
    }

    setIsAdding(true);
    try {
      const { data, error } = await supabase.rpc('add_to_shopping_cart', {
        p_customer_id: activeCustomer.id,
        p_inventory_id: null,
        p_product_id: product.id,
        p_variant_id: activeVariant?.id || null,
        p_quantity: 1,
        p_is_platform: true
      });

      if (error) throw error;
      if (data && !data.success) {
        throw new Error(data.message || 'Failed to add to cart');
      }

      setJustAdded(true);
      window.dispatchEvent(new Event('cartUpdated'));
      toast.success('Added to cart!');
      setTimeout(() => setJustAdded(false), 2000);
    } catch (err: any) {
      console.error('Quick Add error:', err);
      toast.error(err.message || 'Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className={`group relative flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 overflow-hidden hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 ${className}`}>
      
      {/* ── Image Container ── */}
      <div className="relative w-full aspect-[4/5] bg-slate-50 dark:bg-gray-800/60 overflow-hidden">
        <Link href={productUrl} className="block w-full h-full cursor-pointer relative">
          {!imgError && mainImage ? (
            <>
              <Image
                src={mainImage}
                alt={title}
                fill
                priority={priority}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${hoverImage ? 'group-hover:opacity-0' : ''}`}
                onError={() => setImgError(true)}
              />
              {hoverImage && (
                <Image
                  src={hoverImage}
                  alt={`${title} alternate`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out group-hover:scale-105"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-100 dark:bg-gray-800">
              🛍️
            </div>
          )}
        </Link>

        {/* Badges (Top Left) */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
          {discount > 0 && (
            <span className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
              {discount}% OFF
            </span>
          )}
          {isOOS && (
            <span className="bg-slate-900/90 dark:bg-black/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
              Out of Stock
            </span>
          )}
        </div>

        {/* Wishlist Button (Top Right) */}
        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishlistLoading}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
            isWishlisted
              ? 'bg-white dark:bg-gray-800 text-rose-500 shadow-md opacity-100'
              : 'bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-slate-700 dark:text-gray-200 opacity-90 sm:opacity-0 group-hover:opacity-100 shadow-sm'
          } ${wishlistLoading ? 'cursor-wait' : 'cursor-pointer'}`}
        >
          <Heart size={16} className={isWishlisted ? 'fill-rose-500 text-rose-500' : ''} />
        </button>

        {/* Desktop Quick Add Hover Overlay */}
        {!isOOS && (
          <div className="absolute bottom-0 inset-x-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10 hidden sm:block">
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={isAdding}
              className="w-full py-2.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md text-slate-900 dark:text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg border border-white/20 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5"
            >
              {justAdded ? (
                <>
                  <Check size={14} className="text-emerald-500" /> Added
                </>
              ) : isAdding ? (
                'Adding...'
              ) : (
                <>
                  <ShoppingBag size={14} /> Quick Add
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Details Container ── */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1">
        {brand && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-1 truncate">
            {brand}
          </p>
        )}

        <Link href={productUrl} className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-2">
            {title}
          </h3>
        </Link>

        {/* Rating if available */}
        {product.rating !== undefined && (
          <div className="flex items-center gap-1 mb-2">
            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-black">
              <Star size={10} className="fill-amber-500 text-amber-500" />
              {product.rating.toFixed(1)}
            </span>
            {product.reviewCount !== undefined && (
              <span className="text-[11px] text-slate-400 dark:text-gray-500">
                ({product.reviewCount})
              </span>
            )}
          </div>
        )}

        {/* Price & MRP */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">
            ₹{salePrice.toLocaleString('en-IN')}
          </span>
          {mrpPrice && mrpPrice > salePrice && (
            <span className="text-xs text-slate-400 dark:text-gray-500 line-through font-semibold">
              ₹{mrpPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Color Swatches (if fashion has multiple colors) */}
        {colors.length > 1 && (
          <div className="flex items-center gap-1.5 mt-2.5 pt-1">
            {colors.slice(0, 5).map(color => {
              const isSelected = selectedColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedColor(color);
                  }}
                  aria-label={`Select color ${color}`}
                  aria-pressed={isSelected}
                  className={`w-5 h-5 rounded-full flex items-center justify-center p-[1px] transition-all focus:outline-none ${
                    isSelected
                      ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900'
                      : 'hover:scale-110'
                  }`}
                >
                  <span
                    className="w-full h-full rounded-full border border-black/10 dark:border-white/20 shadow-inner"
                    style={{ backgroundColor: color.toLowerCase() }}
                  />
                </button>
              );
            })}
            {colors.length > 5 && (
              <span className="text-[10px] text-slate-400 font-bold">
                +{colors.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Mobile Quick Add Button */}
        {!isOOS && (
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isAdding}
            className="sm:hidden mt-3 w-full py-2 bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1"
          >
            {justAdded ? (
              <>
                <Check size={12} className="text-emerald-500" /> Added
              </>
            ) : (
              <>
                <ShoppingBag size={12} /> Quick Add
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
