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
        className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:border-slate-300 dark:hover:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="flex justify-between items-center p-4 border-b border-[var(--fashion-color-border)]">
                <h2 id="filter-title" className="text-xl font-bold uppercase tracking-wide">Filter & Sort</h2>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-[var(--fashion-color-surface)] rounded-md"
                  aria-label="Close Filters"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Size Section */}
                {facets.sizes.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-lg mb-4 flex justify-between items-center">
                      Size
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {facets.sizes.map(size => (
                        <button
                          key={size.value}
                          onClick={() => toggleSelection(setSelectedSizes, size.value)}
                          className={`py-2 border rounded-md text-sm font-medium transition-colors ${
                            selectedSizes.includes(size.value) 
                              ? 'border-[var(--fashion-color-accent)] bg-[var(--fashion-color-accent)] text-[var(--fashion-color-accent-contrast)]' 
                              : 'border-[var(--fashion-color-border)] hover:border-[var(--fashion-color-accent)]'
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
                    <h3 className="font-semibold text-lg mb-4 flex justify-between items-center">
                      Color
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {facets.colors.map(color => {
                        const isSelected = selectedColors.includes(color.value);
                        return (
                          <button
                            key={color.value}
                            onClick={() => toggleSelection(setSelectedColors, color.value)}
                            className="flex flex-col items-center gap-1"
                            aria-pressed={isSelected}
                          >
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'ring-2 ring-offset-1 ring-[var(--fashion-color-accent)] border-transparent' : 'border-gray-300'}`}
                                 style={{ backgroundColor: color.value.toLowerCase() }}>
                              {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                            </div>
                            <span className="text-xs text-[var(--fashion-color-text-muted)]">{color.value}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Price Section */}
                <section>
                  <h3 className="font-semibold text-lg mb-4 flex justify-between items-center">
                    Price (INR)
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label htmlFor="min-price" className="sr-only">Minimum Price</label>
                      <input 
                        id="min-price"
                        type="number" 
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        className="w-full border border-[var(--fashion-color-border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fashion-color-accent)]"
                      />
                    </div>
                    <span className="text-gray-400">-</span>
                    <div className="flex-1">
                      <label htmlFor="max-price" className="sr-only">Maximum Price</label>
                      <input 
                        id="max-price"
                        type="number" 
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        className="w-full border border-[var(--fashion-color-border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fashion-color-accent)]"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-4 border-t border-[var(--fashion-color-border)] bg-[var(--fashion-color-surface)] flex gap-4">
                <button 
                  onClick={handleClearAll}
                  className="flex-1 py-3 text-[var(--fashion-color-text)] font-semibold border border-[var(--fashion-color-border)] rounded-md bg-white hover:bg-gray-50 transition-colors"
                >
                  Clear All
                </button>
                <button 
                  onClick={handleApply}
                  className="flex-1 py-3 bg-[var(--fashion-color-accent)] text-[var(--fashion-color-accent-contrast)] font-semibold rounded-md hover:opacity-90 transition-opacity shadow-md"
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
