'use client';

import React, { useState } from 'react';
import type { ProductSummary, ProductVariant } from '../../lib/fashion/products';
import ProductCard from '../commerce/ProductCard';
import QuickAddDrawer from '../commerce/QuickAddDrawer';

interface PLPClientWrapperProps {
  products: ProductSummary[];
  viewMode?: 'grid' | 'editorial';
}

export default function PLPClientWrapper({ products }: PLPClientWrapperProps) {
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    product: ProductSummary | null;
    variant: ProductVariant | null;
  }>({
    isOpen: false,
    product: null,
    variant: null
  });

  const handleQuickAdd = (product: ProductSummary, variant?: ProductVariant) => {
    setDrawerState({ isOpen: true, product, variant: variant || null });
  };

  return (
    <>
      {products.map((product, idx) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          priority={idx < 4}
          onQuickAdd={handleQuickAdd}
        />
      ))}
      <QuickAddDrawer 
        isOpen={drawerState.isOpen}
        onClose={() => setDrawerState(prev => ({ ...prev, isOpen: false }))}
        product={drawerState.product}
        initialVariant={drawerState.variant}
      />
    </>
  );
}

