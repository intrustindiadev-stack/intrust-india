'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { History, ShoppingBag, Eye } from 'lucide-react';
import ProductCardV2 from './ProductCardV2';

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
    <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-slate-200/80 dark:border-white/[0.08]">
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/60 dark:border-blue-900/40 shadow-xs">
            <History size={18} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Recently Viewed
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Pick up where you left off
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {items.map((item) => (
          <ProductCardV2
            key={item.id}
            item={item}
          />
        ))}
      </div>
    </div>
  );
}
