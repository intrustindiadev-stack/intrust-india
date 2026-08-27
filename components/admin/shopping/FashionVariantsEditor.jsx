'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Trash2, Box, Image as ImageIcon } from 'lucide-react';
import MultiImageUploader from '@/components/shared/MultiImageUploader';

export default function FashionVariantsEditor({
  enabled,
  onToggle,
  fashionCategoryId,
  onCategoryChange,
  variants,
  onVariantsChange,
  uploadAction,
  role
}) {
  const [categories, setCategories] = useState([]);
  
  // Fetch fashion categories
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('fashion_categories')
        .select('id, name, path, level')
        .order('path', { ascending: true });
        
      if (data) setCategories(data);
    }
    loadCategories();
  }, []);

  const addVariant = () => {
    onVariantsChange([
      ...variants,
      {
        id: crypto.randomUUID(),
        sku: '',
        color: '',
        size: '',
        fit: 'Regular',
        fabric: '',
        price_paise: '',
        compare_at_price_paise: '',
        inventory_quantity: '0',
        media: []
      }
    ]);
  };

  const removeVariant = (id) => {
    onVariantsChange(variants.filter(v => v.id !== id));
  };

  const updateVariant = (id, field, value) => {
    onVariantsChange(variants.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600">
            <Box size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Fashion Variants</h3>
            <p className="text-xs font-medium text-slate-500">Enable advanced size and color variants</p>
          </div>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-fuchsia-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
        </label>
      </div>

      {enabled && (
        <div className="space-y-8 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Fashion Category</label>
            <select
              value={fashionCategoryId || ''}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-fuchsia-500/10 focus:border-fuchsia-500 outline-none transition-all font-bold text-slate-900"
              required={enabled}
            >
              <option value="" disabled>Select the deepest category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {/* Indent based on level visually */}
                  {Array(cat.level - 1).fill('\u00A0\u00A0\u00A0\u00A0').join('')}
                  {cat.level > 1 ? '↳ ' : ''}
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-900">Variants ({variants.length})</h4>
            
            {variants.map((variant, index) => (
              <div key={variant.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-700 text-sm">Variant #{index + 1}</span>
                  <button 
                    type="button" 
                    onClick={() => removeVariant(variant.id)}
                    className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Color</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Red" 
                      value={variant.color} 
                      onChange={e => updateVariant(variant.id, 'color', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Size</label>
                    <input 
                      type="text" 
                      placeholder="e.g. S, M, L" 
                      value={variant.size} 
                      onChange={e => updateVariant(variant.id, 'size', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Fit</label>
                    <select 
                      value={variant.fit} 
                      onChange={e => updateVariant(variant.id, 'fit', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                    >
                      <option value="Regular">Regular</option>
                      <option value="Slim">Slim</option>
                      <option value="Oversized">Oversized</option>
                      <option value="Relaxed">Relaxed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">SKU</label>
                    <input 
                      type="text" 
                      placeholder="Unique SKU" 
                      value={variant.sku} 
                      onChange={e => updateVariant(variant.id, 'sku', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium font-mono"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Price (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={variant.price_paise ? (variant.price_paise / 100).toString() : ''} 
                      onChange={e => updateVariant(variant.id, 'price_paise', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : '')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Compare-at (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={variant.compare_at_price_paise ? (variant.compare_at_price_paise / 100).toString() : ''} 
                      onChange={e => updateVariant(variant.id, 'compare_at_price_paise', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : '')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 line-through"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Stock</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={variant.inventory_quantity} 
                      onChange={e => updateVariant(variant.id, 'inventory_quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2">Variant Images</label>
                  <MultiImageUploader
                      images={variant.media.map(m => m.image_url)}
                      onChange={(urls) => {
                        const newMedia = urls.map((url, i) => ({
                          image_url: url,
                          alt_text: `${variant.color} - Image ${i+1}`,
                          display_order: i
                        }));
                        updateVariant(variant.id, 'media', newMedia);
                      }}
                      uploadAction={uploadAction}
                      role={role}
                      maxImages={4}
                  />
                </div>
              </div>
            ))}

            <button 
              type="button" 
              onClick={addVariant}
              className="w-full py-3 border-2 border-dashed border-fuchsia-200 rounded-2xl text-fuchsia-600 font-bold hover:bg-fuchsia-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Variant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
