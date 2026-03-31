'use client';

import { useState } from 'react';
import { Search, Tag, Box, ShoppingBag, ArrowRight, Store, Lock, Package, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function MerchantInventoryClient({ initialInventory, merchant }) {
    const [inventory, setInventory] = useState(initialInventory);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [isUpdating, setIsUpdating] = useState(null);
    // Track per-item editable price state (custom products only)
    const [editPrices, setEditPrices] = useState({});

    const filteredInventory = inventory.filter(item => {
        const product = item.shopping_products;
        const title = item.custom_title || product?.title || '';
        const category = product?.category || '';
        const matchesSearch =
            title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
            filterType === 'all' ||
            (filterType === 'platform' && item.is_platform_product) ||
            (filterType === 'custom' && !item.is_platform_product);
        return matchesSearch && matchesFilter;
    });

    const handleToggleActive = async (itemId, currentStatus) => {
        setIsUpdating(itemId);
        try {
            const { error } = await supabase
                .from('merchant_inventory')
                .update({ is_active: !currentStatus })
                .eq('id', itemId);

            if (error) throw error;

            setInventory(prev =>
                prev.map(item =>
                    item.id === itemId ? { ...item, is_active: !currentStatus } : item
                )
            );
            toast.success(currentStatus ? 'Unpublished from shop' : 'Published to shop!');
        } catch {
            toast.error('Failed to update visibility');
        } finally {
            setIsUpdating(null);
        }
    };

    const handleUpdateStock = async (item, newStock) => {
        if (newStock < 0 || isNaN(newStock)) return;
        if (item.is_platform_product) {
            toast.error('Platform product stock is managed via Wholesale.');
            return;
        }

        try {
            const { data, error } = await supabase.rpc('update_merchant_inventory_stock', {
                p_inventory_id: item.id,
                p_new_stock: newStock,
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.message);

            setInventory(prev =>
                prev.map(i => i.id === item.id ? { ...i, stock_quantity: newStock } : i)
            );
            toast.success('Stock updated');

            if (newStock <= 5) {
                const title = item.custom_title || item.shopping_products?.title;
                supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: 'Low Stock Alert',
                    body: `Only ${newStock} units left for ${title}. Restock soon.`,
                    type: 'warning',
                    reference_id: item.id,
                    reference_type: 'merchant_inventory',
                }).then(({ error: notifError }) => {
                    if (notifError) console.error('Low stock notification error:', notifError);
                });
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update stock');
        }
    };

    // Only allowed for CUSTOM products — platform products get the suggested retail price locked
    const handleUpdatePrice = async (itemId, newPriceRupees) => {
        const pricePaise = Math.round(parseFloat(newPriceRupees) * 100);
        if (isNaN(pricePaise) || pricePaise < 0) return;

        try {
            const { error } = await supabase
                .from('merchant_inventory')
                .update({ retail_price_paise: pricePaise })
                .eq('id', itemId);

            if (error) throw error;

            setInventory(prev =>
                prev.map(item =>
                    item.id === itemId ? { ...item, retail_price_paise: pricePaise } : item
                )
            );
            setEditPrices(prev => ({ ...prev, [itemId]: undefined }));
            toast.success('Retail price updated');
        } catch {
            toast.error('Failed to update price');
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or category..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-white dark:border-white/10 focus:border-blue-200 dark:focus:border-blue-600 shadow-lg shadow-slate-200/50 dark:shadow-none bg-white dark:bg-white/5 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900 dark:text-slate-100 text-sm"
                    />
                </div>

                {/* Type Filter */}
                <div className="flex items-center p-1 bg-white dark:bg-white/5 rounded-2xl border border-white dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-none flex-shrink-0">
                    {['all', 'platform', 'custom'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType === type
                                ? 'bg-[#1e3a5f] text-white shadow-lg shadow-blue-900/20'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                        >
                            {type === 'all' ? 'All' : type === 'platform' ? 'Platform' : 'Custom'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Count */}
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">
                {filteredInventory.length} product{filteredInventory.length !== 1 ? 's' : ''} found
            </p>

            {/* Inventory Cards */}
            <AnimatePresence>
                {filteredInventory.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-20 text-center bg-white dark:bg-white/5 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10"
                    >
                        <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5">
                            <Package className="text-slate-300 dark:text-white/20" size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                            Catalog is Empty
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto font-medium mb-6">
                            Source products from the wholesale market to stock your shop.
                        </p>
                        <Link
                            href="/merchant/shopping/wholesale"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1e3a5f] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-[#2c5282] transition-all"
                        >
                            <ShoppingBag size={16} />
                            Browse Wholesale
                            <ArrowRight size={14} />
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredInventory.map((item, idx) => {
                            const product = item.shopping_products;
                            const isPlatform = item.is_platform_product;
                            const isUpdatingThis = isUpdating === item.id;
                            const title = item.custom_title || product?.title || 'Untitled';
                            const description = item.custom_description || product?.description || '';
                            const currentEditPrice = editPrices[item.id];

                            const costPaise = isPlatform ? product?.wholesale_price_paise : null;
                            const retailPaise = item.retail_price_paise;
                            const suggestedPaise = product?.suggested_retail_price_paise;

                            // For platform products: retail price is locked to the platform-suggested price
                            const displayRetailPrice = isPlatform
                                ? (suggestedPaise / 100)
                                : (retailPaise / 100);

                            return (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className={`bg-white dark:bg-white/5 rounded-[2rem] border overflow-hidden shadow-sm transition-all duration-300 flex flex-col ${item.is_active
                                        ? 'border-slate-100 dark:border-white/10 hover:shadow-xl hover:shadow-blue-600/5'
                                        : 'border-slate-200 dark:border-white/5 opacity-65 grayscale-[0.3]'
                                        }`}
                                >
                                    {/* Image + Badges */}
                                    <div className="relative aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 overflow-hidden">
                                        {product?.product_images?.[0] ? (
                                            <img
                                                src={product.product_images[0]}
                                                alt={title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Store size={36} className="text-slate-300 dark:text-white/20" />
                                            </div>
                                        )}

                                        {/* Overlay when inactive */}
                                        {!item.is_active && (
                                            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center">
                                                <span className="bg-white/90 dark:bg-black/60 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm">
                                                    Draft
                                                </span>
                                            </div>
                                        )}

                                        {/* Type badge */}
                                        <div className="absolute top-3 left-3">
                                            {isPlatform ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/90 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm">
                                                    <Box size={10} /> Platform
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-600/90 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm">
                                                    <Tag size={10} /> Custom
                                                </span>
                                            )}
                                        </div>

                                        {/* Stock badge */}
                                        <div className="absolute top-3 right-3">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm ${item.stock_quantity <= 5
                                                ? 'bg-amber-500/90 text-white'
                                                : 'bg-black/40 text-white'
                                                }`}>
                                                {item.stock_quantity <= 5 && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                {item.stock_quantity} in stock
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4 flex flex-col gap-3 flex-1">
                                        {/* Title + Category */}
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight line-clamp-1 mb-0.5">
                                                {title}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                {product?.category || 'General'}
                                            </p>
                                        </div>

                                        {/* Price info row */}
                                        <div className="flex items-stretch gap-2">
                                            {/* Cost Price (platform only) */}
                                            {isPlatform && costPaise != null && (
                                                <div className="flex-1 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-0.5">Cost</p>
                                                    <p className="text-sm font-black text-blue-700 dark:text-blue-300">
                                                        ₹{(costPaise / 100).toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Retail Price */}
                                            <div className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                        {isPlatform ? 'Retail (Fixed)' : 'Retail Price'}
                                                    </p>
                                                    {isPlatform && (
                                                        <Lock size={8} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                                {isPlatform ? (
                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                                                        ₹{displayRetailPrice.toLocaleString('en-IN')}
                                                    </p>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-black text-slate-500 dark:text-slate-400">₹</span>
                                                        <input
                                                            type="number"
                                                            value={currentEditPrice !== undefined ? currentEditPrice : (retailPaise / 100)}
                                                            onChange={e => setEditPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                            onBlur={e => handleUpdatePrice(item.id, e.target.value)}
                                                            className="w-full text-sm font-black text-slate-800 dark:text-slate-100 bg-transparent outline-none focus:text-blue-600 dark:focus:text-blue-400 transition-colors [appearance:textfield]"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Profit tile */}
                                        {isPlatform && costPaise != null && suggestedPaise != null ? (() => {
                                            const profitPerUnit = (suggestedPaise - costPaise) / 100;
                                            const marginPct = ((profitPerUnit / (suggestedPaise / 100)) * 100).toFixed(1);
                                            const totalProfit = profitPerUnit * item.stock_quantity;
                                            const isPositive = profitPerUnit > 0;
                                            return (
                                                <div className={`flex items-stretch gap-2 p-2.5 rounded-xl border ${isPositive
                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'
                                                    : 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20'
                                                    }`}>
                                                    <div className="flex-1">
                                                        <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500'}`}>
                                                            Profit / Unit
                                                        </p>
                                                        <p className={`text-sm font-black ${isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600'}`}>
                                                            ₹{profitPerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            <span className="text-[9px] font-bold ml-1 opacity-70">({marginPct}%)</span>
                                                        </p>
                                                    </div>
                                                    <div className="flex-1 border-l border-current/10 pl-2.5">
                                                        <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500'}`}>
                                                            Total Potential
                                                        </p>
                                                        <p className={`text-sm font-black ${isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600'}`}>
                                                            ₹{totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })() : !isPlatform ? (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Profit</p>
                                                <span className="text-xs font-black text-slate-400 dark:text-slate-500">—</span>
                                                <p className="text-[8px] text-slate-400 dark:text-slate-500 ml-auto">No cost tracked for custom products</p>
                                            </div>
                                        ) : null}

                                        {/* Platform locked price note */}
                                        {isPlatform && (
                                            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                                                <Lock size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 leading-relaxed">
                                                    Retail price is set by the platform and cannot be modified.
                                                </p>
                                            </div>
                                        )}

                                        {/* Stock controls */}
                                        <div>
                                            {isPlatform ? (
                                                <Link
                                                    href="/merchant/shopping/wholesale"
                                                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest transition-all group"
                                                >
                                                    <ShoppingBag size={12} />
                                                    Restock via Wholesale
                                                    <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                                                </Link>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">Stock</p>
                                                    <div className="flex items-center bg-slate-100 dark:bg-white/10 rounded-xl overflow-hidden flex-1">
                                                        <button
                                                            onClick={() => handleUpdateStock(item, Math.max(0, item.stock_quantity - 1))}
                                                            className="px-3 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                                        >
                                                            <Minus size={13} />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            defaultValue={item.stock_quantity}
                                                            onBlur={e => handleUpdateStock(item, parseInt(e.target.value))}
                                                            className="flex-1 text-center text-sm font-black text-slate-900 dark:text-slate-100 bg-transparent outline-none [appearance:textfield] py-2"
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateStock(item, item.stock_quantity + 1)}
                                                            className="px-3 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                                        >
                                                            <Plus size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Publish / Depublish */}
                                        <button
                                            onClick={() => handleToggleActive(item.id, item.is_active)}
                                            disabled={isUpdatingThis}
                                            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${item.is_active
                                                ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20'
                                                : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500 ring-offset-1 dark:ring-offset-transparent'
                                                }`}
                                        >
                                            {isUpdatingThis ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                    Saving...
                                                </>
                                            ) : item.is_active ? (
                                                'Depublish'
                                            ) : (
                                                'Publish Live'
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
