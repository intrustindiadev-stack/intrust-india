'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { FacetResult } from '../../lib/fashion/facets';

interface FilterDrawerProps {
  facets: FacetResult;
  totalResults: number;
}

export default function FilterDrawer({ facets, totalResults }: FilterDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for filters before applying
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // Initialize from URL on mount and when searchParams change
  useEffect(() => {
    const color = searchParams?.get('color');
    const size = searchParams?.get('size');
    const price = searchParams?.get('price');
    
    setSelectedColors(color ? color.split(',') : []);
    setSelectedSizes(size ? size.split(',') : []);
    
    if (price) {
      const [min, max] = price.split('-');
      setPriceRange({ min: min || '', max: max || '' });
    } else {
      setPriceRange({ min: '', max: '' });
    }
  }, [searchParams]);

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const activeFilterCount = selectedColors.length + selectedSizes.length + (priceRange.min || priceRange.max ? 1 : 0);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    if (selectedColors.length > 0) params.set('color', selectedColors.join(','));
    else params.delete('color');
    
    if (selectedSizes.length > 0) params.set('size', selectedSizes.join(','));
    else params.delete('size');
    
    if (priceRange.min || priceRange.max) params.set('price', `${priceRange.min}-${priceRange.max}`);
    else params.delete('price');
    
    // Reset page on filter change
    params.set('page', '1');
    
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setPriceRange({ min: '', max: '' });
    
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('color');
    params.delete('size');
    params.delete('price');
    params.set('page', '1');
    
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-2.5 border-b-2 border-slate-900 dark:border-white bg-transparent text-slate-900 dark:text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors focus:outline-none"
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 right-0 w-[90%] max-w-sm bg-[var(--fashion-color-bg)] shadow-xl z-[110] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="filter-title"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                <h2 id="filter-title" className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Filter & Sort</h2>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-900 dark:text-white"
                  aria-label="Close Filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-10 no-scrollbar">
                {/* Size Section */}
                {facets.sizes.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-slate-900 dark:text-white">
                      Size
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {facets.sizes.map(size => (
                        <button
                          key={size.value}
                          onClick={() => toggleSelection(setSelectedSizes, size.value)}
                          className={`py-3 border rounded-none text-xs font-bold transition-colors ${
                            selectedSizes.includes(size.value) 
                              ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' 
                              : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white'
                          }`}
                        >
                          {size.value}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Color Section */}
                {facets.colors.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-slate-900 dark:text-white">
                      Color
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {facets.colors.map(color => {
                        const isSelected = selectedColors.includes(color.value);
                        return (
                          <button
                            key={color.value}
                            onClick={() => toggleSelection(setSelectedColors, color.value)}
                            className="flex flex-col items-center gap-2"
                            aria-pressed={isSelected}
                          >
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-slate-900 dark:border-white scale-110' : 'border-slate-200 dark:border-slate-700'}`}
                                 style={{ backgroundColor: color.value.toLowerCase() }}>
                              {isSelected && <Check className="w-4 h-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{color.value}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Price Section */}
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-slate-900 dark:text-white">
                    Price (INR)
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 relative">
                      <label htmlFor="min-price" className="sr-only">Minimum Price</label>
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      <input 
                        id="min-price"
                        type="number" 
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none pl-7 pr-3 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                      />
                    </div>
                    <span className="text-slate-400">-</span>
                    <div className="flex-1 relative">
                      <label htmlFor="max-price" className="sr-only">Maximum Price</label>
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      <input 
                        id="max-price"
                        type="number" 
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none pl-7 pr-3 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-black flex gap-4 mt-auto">
                <button 
                  onClick={handleClearAll}
                  className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-none hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  Clear All
                </button>
                <button 
                  onClick={handleApply}
                  className="flex-1 py-4 text-xs font-bold uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-none hover:bg-black dark:hover:bg-slate-200 transition-colors shadow-lg"
                >
                  Apply ({totalResults})
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
