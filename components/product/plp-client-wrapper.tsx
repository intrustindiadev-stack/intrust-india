'use client';

import React, { useState } from 'react';
import type { ProductSummary, ProductVariant } from '../../lib/fashion/products';
import ProductCard from './product-card';
import QuickAddSheet from './quick-add-sheet';

interface PLPClientWrapperProps {
  products: ProductSummary[];
  viewMode: 'grid' | 'editorial';
}

export default function PLPClientWrapper({ products, viewMode }: PLPClientWrapperProps) {
  const [sheetState, setSheetState] = useState<{
    isOpen: boolean;
    product: ProductSummary | null;
    variant: ProductVariant | null;
  }>({
    isOpen: false,
    product: null,
    variant: null
  });

  const handleQuickAdd = (product: ProductSummary, variant: ProductVariant) => {
    setSheetState({ isOpen: true, product, variant });
  };

  return (
    <>
      {products.map(product => (
        <ProductCard 
          key={product.id} 
          product={product} 
          viewMode={viewMode}
          onQuickAdd={handleQuickAdd}
        />
      ))}
      <QuickAddSheet 
        isOpen={sheetState.isOpen}
        onClose={() => setSheetState({ ...sheetState, isOpen: false })}
        product={sheetState.product}
        initialVariant={sheetState.variant}
      />
    </>
  );
}
