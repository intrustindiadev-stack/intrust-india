'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Store, Star, MapPin, Phone, ShieldCheck, ArrowRight, 
  Clock, Truck, Users, Sparkles, Plus, Check, ShoppingBag, ChevronRight 
} from 'lucide-react';
import { getDepartmentMeta } from '@/lib/constants/departments';
import { getProductFallbackImage } from '@/lib/shopping/categories';
import toast from 'react-hot-toast';

// Instagram-style clean blue verified badge
function VerifiedBadge({ size = 16, className = '' }) {
  return (
    <svg 
      className={`shrink-0 ${className}`} 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
      title="Verified Store"
    >
      <circle cx="12" cy="12" r="10" fill="#0095F6" />
      <path 
        d="M8.5 12.5L10.8 14.8L15.5 9.8" 
        stroke="white" 
        strokeWidth="2.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}

export default function MerchantCard({ 
  merchant, 
  variant = 'showcase', 
  className = '' 
}) {
  const router = useRouter();

  if (!merchant) return null;

  const fallbackBanner = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80';
  const banner = merchant.shopping_banner_url || fallbackBanner;
  const logo = merchant.logo_url || merchant.profile_photo_url;
  const isOpen = merchant.is_open !== false;
  
  // Dynamic hours & rating
  const storeHours = merchant.opening_hours || '9:00 AM - 10:00 PM';
  const ratingVal = merchant.avg_rating || merchant.rating?.avg_rating || (merchant.id ? '4.8' : null);
  const totalReviews = merchant.total_ratings || merchant.rating?.total_ratings || (merchant.id ? '64' : '20+');
  
  // Dynamic Department Meta
  const deptMeta = getDepartmentMeta(merchant.department);
  const storeUrl = `/shop/${merchant.slug || merchant.id}`;

  // ─────────────────────────────────────────────────────────────
  // COMPACT VARIANT (Shop Hub list view & Drawer)
  // ─────────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div
        onClick={() => router.push(storeUrl)}
        className={`group bg-surface-container-lowest hover:bg-surface-container-low/40 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 border border-outline-variant/30 hover:border-primary/40 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
          {/* Store Thumbnail with Live status */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-surface-container shrink-0">
            <img
              src={banner}
              alt={merchant.business_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {/* Live Indicator overlay */}
            <div className="absolute top-1.5 left-1.5">
              {isOpen ? (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-600/95 text-white text-[9px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-800/90 text-slate-300 text-[9px] font-bold uppercase tracking-wider">
                  Closed
                </span>
              )}
            </div>
          </div>

          {/* Store Info */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-extrabold text-sm sm:text-base text-on-surface truncate group-hover:text-primary transition-colors">
                {merchant.business_name}
              </h4>
              <VerifiedBadge size={15} />
            </div>

            <p className="text-[11px] sm:text-xs text-on-surface-variant/80 truncate font-medium">
              {deptMeta.label} {merchant.business_address ? `• ${merchant.business_address}` : ''}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 text-[10px] sm:text-[11px] text-on-surface-variant font-medium pt-0.5">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <Clock size={11} className="shrink-0" />
                <span>{isOpen ? 'Open Now' : 'Closed'}</span>
                <span className="text-on-surface-variant font-normal">({storeHours})</span>
              </span>
              <span className="hidden xs:flex items-center gap-1">
                <Truck size={11} className="text-primary shrink-0" />
                <span>Same Day Delivery</span>
              </span>
            </div>
          </div>
        </div>

        {/* Rating & Chevron */}
        <div className="flex items-center gap-2 shrink-0 pl-1">
          {ratingVal && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 text-amber-900 dark:text-amber-200 text-xs font-black">
              <Star size={12} className="text-amber-500 fill-amber-500" />
              <span>{Number(ratingVal).toFixed(1)}</span>
            </div>
          )}
          <ChevronRight size={18} className="text-on-surface-variant/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SHOWCASE VARIANT (Shop Hub & Nearby Stores Grid)
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      onClick={() => router.push(storeUrl)}
      className={`group bg-surface-container-lowest hover:bg-surface-container-lowest/90 rounded-3xl p-4 sm:p-5 border border-outline-variant/30 hover:border-primary/40 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer ${className}`}
    >
      <div>
        {/* Top Banner with Badges & Dynamic Rating */}
        <div className="relative h-44 sm:h-48 w-full rounded-2xl overflow-hidden bg-surface-container-low mb-4">
          <img
            src={banner}
            alt={merchant.business_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/30" />

          {/* Top Live Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {isOpen ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-600/95 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live Store
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md text-slate-200 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                Closed
              </span>
            )}
          </div>

          {/* Top Right Dynamic Rating Pill */}
          {ratingVal && (
            <div className="absolute top-3 right-3 px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/15 shadow-md flex items-center gap-1.5">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-xs font-black">{Number(ratingVal).toFixed(1)}</span>
              <span className="text-[10px] text-white/70 font-semibold">({totalReviews})</span>
            </div>
          )}

          {/* Bottom Banner Department Badge & Tagline */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-white">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold truncate drop-shadow-sm">
                {merchant.tagline || deptMeta.description || 'Quality products, better living.'}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-black bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1">
              <span>{deptMeta.badge}</span>
              <ArrowRight size={10} />
            </span>
          </div>
        </div>

        {/* Store Title, Avatar, Blue Tick & Department */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden shadow-xs">
            {logo ? (
              <img src={logo} alt={merchant.business_name} className="w-full h-full object-cover" />
            ) : (
              <Store size={22} className="text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-base sm:text-lg text-on-surface truncate group-hover:text-primary transition-colors">
                {merchant.business_name}
              </h3>
              <VerifiedBadge size={16} />
            </div>

            <p className="text-xs font-semibold text-on-surface-variant truncate mt-0.5">
              {deptMeta.label} {merchant.business_address ? `• ${merchant.business_address}` : ''}
            </p>
          </div>
        </div>

        {/* 2-Column Clean Quick Stats Row (Hours & Delivery) */}
        <div className="grid grid-cols-2 gap-2.5 py-2.5 px-3.5 rounded-2xl bg-surface-container/50 border border-outline-variant/20 mb-4 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <Clock size={12} className="shrink-0" />
              <span>{isOpen ? 'Open Now' : 'Closed'}</span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-medium truncate max-w-full">
              {storeHours}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center border-l border-outline-variant/30">
            <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
              <Truck size={12} className="shrink-0" />
              <span>Delivery</span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-medium">
              Same Day Dispatch
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(storeUrl);
          }}
          className="w-full py-3 px-4 rounded-2xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all"
        >
          <Store size={15} />
          <span>Visit Storefront</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
