'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { History, ShoppingBag, Eye } from 'lucide-react';
import ProductCard from './ProductCard';

export interface RecentlyViewedItem {
  id: string;
  title: string;
  category?: string;
  price_paise: number;
  compare_at_price_paise?: number | null;
  image?: string;
  is_fashion?: boolean;
  slug?: string;
  timestamp: number;
}

const STORAGE_KEY = 'intrust_recently_viewed';
const MAX_ITEMS = 8;

export function recordRecentlyViewed(item: Omit<RecentlyViewedItem, 'timestamp'>) {
  if (typeof window === 'undefined' || !item.id) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: RecentlyViewedItem[] = raw ? JSON.parse(raw) : [];
    
    // Remove duplicate of this item
    list = list.filter(i => i.id !== item.id);
    
    // Add to front
    list.unshift({ ...item, timestamp: Date.now() });
    
    // Cap at MAX_ITEMS
    if (list.length > MAX_ITEMS) {
      list = list.slice(0, MAX_ITEMS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    // Ignore storage quota errors
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  if (typeof window === 'undefined') return '[]';
  return localStorage.getItem(STORAGE_KEY) || '[]';
}

function getServerSnapshot() {
  return '[]';
}

export default function RecentlyViewed({ currentProductId }: { currentProductId?: string }) {
  const rawList = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const items = React.useMemo(() => {
    try {
      let list: RecentlyViewedItem[] = JSON.parse(rawList);
      if (currentProductId) {
        list = list.filter(i => i.id !== currentProductId);
      }
      return list.slice(0, 4);
    } catch {
      return [];
    }
  }, [rawList, currentProductId]);

  if (items.length === 0) return null;

  return (
    <div className="mt-16 pt-10 border-t border-slate-100 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <History size={16} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Recently Viewed
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Pick up where you left off
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map((item) => {
          const productShim: any = {
            id: item.id,
            title: item.title,
            category: item.category || 'General',
            suggested_retail_price_paise: item.price_paise,
            mrp_paise: item.compare_at_price_paise,
            product_images: item.image ? [item.image] : [],
            slug: item.slug || item.id,
            is_platform: true,
            variants: item.is_fashion ? [{
              id: item.id,
              price_paise: item.price_paise,
              compare_at_price_paise: item.compare_at_price_paise,
              inventory_quantity: 10,
              media: item.image ? [{ image_url: item.image }] : []
            }] : []
          };

          return (
            <ProductCard key={item.id} product={productShim} />
          );
        })}
      </div>
    </div>
  );
}
