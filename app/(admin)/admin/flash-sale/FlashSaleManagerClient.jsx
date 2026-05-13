'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabaseClient';
import { formatDistanceToNowStrict } from 'date-fns';
import {
    Zap,
    Package,
    ChevronUp,
    ChevronDown,
    Trash2,
    Clock,
    ChevronDown as ChevronDownIcon,
    Plus,
    Loader2,
    Search,
    X,
    ToggleLeft,
    ToggleRight,
    RefreshCw,
    AlertCircle
} from 'lucide-react';

// --- Helpers ---

function useDebouncedValue(value, ms) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setDebouncedValue(value);
        }, ms);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [value, ms]);

    return debouncedValue;
}

const formatPaise = (paise) => {
    return `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;
};

const getToken = async () => {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token;
};

const authFetch = async (url, options = {}) => {
    const token = await getToken();
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    });
};

export default function FlashSaleManagerClient({ initialItems }) {
    const [items, setItems] = useState(initialItems);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [tick, setTick] = useState(Date.now());

    // Search & Add Form State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [discountPct, setDiscountPct] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [position, setPosition] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [reordering, setReordering] = useState(null);

    const debouncedQuery = useDebouncedValue(searchQuery, 300);

    const fetchItems = useCallback(async () => {
        try {
            const res = await authFetch('/api/admin/flash-sale');
            const data = await res.json();
            if (res.ok) {
                setItems(data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch items:', error);
        }
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setTick(Date.now()), 30_000);
        
        const supabase = createClient();
        const channel = supabase
            .channel('admin-flash-sale-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_sale_items' }, () => fetchItems())
            .subscribe();

        return () => {
            clearInterval(timer);
            supabase.removeChannel(channel);
        };
    }, [fetchItems]);

    useEffect(() => {
        async function performSearch() {
            if (debouncedQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setSearchLoading(true);
            try {
                const res = await authFetch(`/api/admin/products/search?q=${encodeURIComponent(debouncedQuery)}`);
                const data = await res.json();
                if (res.ok) setSearchResults(data.products || []);
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setSearchLoading(false);
            }
        }
        performSearch();
    }, [debouncedQuery]);

    // Derived Values
    const activeItems = items.filter(i => i.is_active && (!i.ends_at || new Date(i.ends_at) > new Date()))
        .sort((a, b) => a.position - b.position);
    const inactiveItems = items.filter(i => !activeItems.some(active => active.id === i.id));
    const activeCount = activeItems.length;
    const isFull = activeCount >= 5;
    const occupiedSlots = new Set(activeItems.map(i => i.position));
    const nextFreeSlot = [1, 2, 3, 4, 5].find(n => !occupiedSlots.has(n)) ?? null;

    useEffect(() => {
        if (selectedProduct && !position) {
            setPosition(nextFreeSlot?.toString() || '');
        }
    }, [selectedProduct, nextFreeSlot, position]);

    const basePrice = selectedProduct
        ? (selectedProduct.mrp_paise || selectedProduct.suggested_retail_price_paise)
        : 0;
    
    const discNum = parseInt(discountPct);
    const computedSalePrice = discNum >= 1 && discNum <= 99
        ? Math.floor(basePrice * (100 - discNum) / 100)
        : null;

    // Handlers
    const handleAddItem = async () => {
        if (!selectedProduct || !discountPct || discNum < 1 || discNum > 99 || isFull) return;
        setSubmitting(true);
        try {
            const body = {
                product_id: selectedProduct.id,
                discount_percent: discNum,
                position: parseInt(position),
                ends_at: endsAt ? new Date(endsAt).toISOString() : null
            };
            const res = await authFetch('/api/admin/flash-sale', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Added to flash sale!');
                setSelectedProduct(null);
                setDiscountPct('');
                setPosition('');
                setEndsAt('');
                setSearchQuery('');
                fetchItems();
                setShowAddForm(false);
            } else {
                toast.error(data.error || 'Failed to add item');
            }
        } catch (err) {
            toast.error('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (item) => {
        try {
            const res = await authFetch(`/api/admin/flash-sale/${item.id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: !item.is_active })
            });
            if (res.ok) {
                toast.success(item.is_active ? 'Deactivated' : 'Activated');
                fetchItems();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update');
            }
        } catch (err) {
            toast.error('Network error');
        }
    };

    const handleReactivate = async (item) => {
        if (!nextFreeSlot) {
            toast.error('Flash sale is full');
            return;
        }
        try {
            const res = await authFetch(`/api/admin/flash-sale/${item.id}`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    is_active: true, 
                    ends_at: null, 
                    position: nextFreeSlot 
                })
            });
            if (res.ok) {
                toast.success('Re-activated');
                fetchItems();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to re-activate');
            }
        } catch (err) {
            toast.error('Network error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this item from flash sale?')) return;
        try {
            const res = await authFetch(`/api/admin/flash-sale/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success('Removed from flash sale');
                fetchItems();
            } else {
                toast.error('Failed to delete');
            }
        } catch (err) {
            toast.error('Network error');
        }
    };

    const handleReorder = async (item, direction) => {
        const currentIndex = activeItems.findIndex(i => i.id === item.id);
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const targetItem = activeItems[targetIndex];

        if (!targetItem) return;

        setReordering(item.id);
        try {
            // Deactivate both first
            await authFetch(`/api/admin/flash-sale/${item.id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: false })
            });
            await authFetch(`/api/admin/flash-sale/${targetItem.id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: false })
            });

            // Swap positions and activate
            await authFetch(`/api/admin/flash-sale/${item.id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: true, position: targetItem.position })
            });
            await authFetch(`/api/admin/flash-sale/${targetItem.id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: true, position: item.position })
            });
            fetchItems();
        } catch (err) {
            toast.error('Reorder failed');
        } finally {
            setReordering(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 size={32} className="animate-spin text-slate-400" />
                <p className="text-slate-500 font-medium">Loading flash sale...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Zap className="text-amber-500 fill-amber-500" size={24} />
                        Flash Sale Manager
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Manage top-bar timed discounts</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                >
                    {showAddForm ? <X size={18} /> : <Plus size={18} />}
                    {showAddForm ? 'Cancel' : 'Add Item'}
                </button>
            </div>

            {/* Section B: Add Form */}
            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4 mb-6">
                            {isFull && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-semibold">
                                    <AlertCircle size={16} />
                                    Flash sale is full — remove or deactivate an item first.
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Product Selection */}
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Select Product</label>
                                    {!selectedProduct ? (
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search by name or slug..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm font-bold"
                                            />
                                            {searchLoading && (
                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={16} />
                                            )}

                                            {/* Dropdown */}
                                            {searchResults.length > 0 && (
                                                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto divide-y divide-slate-100">
                                                    {searchResults.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => {
                                                                setSelectedProduct(p);
                                                                setSearchResults([]);
                                                                setSearchQuery('');
                                                            }}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                                                        >
                                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0">
                                                                {p.product_images?.[0] ? (
                                                                    <img src={p.product_images[0]} className="w-full h-full object-cover rounded-lg" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-slate-300" /></div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-bold text-slate-900 truncate">{p.title}</div>
                                                                <div className="text-xs text-slate-500 font-medium">{formatPaise(p.mrp_paise || p.suggested_retail_price_paise)}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-2 bg-blue-50 border border-blue-100 rounded-xl">
                                            <div className="w-10 h-10 rounded-lg bg-white p-1">
                                                {selectedProduct.product_images?.[0] ? (
                                                    <img src={selectedProduct.product_images[0]} className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-slate-300" /></div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-slate-900 truncate">{selectedProduct.title}</div>
                                                <div className="text-xs text-blue-600 font-bold">{formatPaise(selectedProduct.mrp_paise || selectedProduct.suggested_retail_price_paise)}</div>
                                            </div>
                                            <button onClick={() => setSelectedProduct(null)} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-blue-600 transition-colors">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Discount & Position */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Discount %</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={discountPct}
                                            onChange={(e) => setDiscountPct(e.target.value)}
                                            placeholder="e.g. 50"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Target Slot</label>
                                        <select
                                            value={position}
                                            onChange={(e) => setPosition(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm font-bold appearance-none cursor-pointer"
                                        >
                                            <option value="">Select Slot</option>
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <option key={n} value={n} disabled={occupiedSlots.has(n)}>
                                                    Slot {n} {occupiedSlots.has(n) ? '(Taken)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Expiry */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">End Date (Optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={endsAt}
                                        onChange={(e) => setEndsAt(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm font-bold"
                                    />
                                </div>

                                {/* Summary */}
                                <div className="bg-slate-50 rounded-xl p-4 flex flex-col justify-center">
                                    {computedSalePrice ? (
                                        <div className="space-y-1">
                                            <div className="text-xs text-slate-500 font-bold uppercase">Estimated Sale Price</div>
                                            <div className="text-xl font-black text-emerald-600">{formatPaise(computedSalePrice)}</div>
                                            <div className="text-xs text-slate-400 font-medium">Original: {formatPaise(basePrice)}</div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-sm font-medium italic">Enter discount to see price...</div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleAddItem}
                                disabled={!selectedProduct || !discountPct || discNum < 1 || discNum > 99 || isFull || submitting}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} className="fill-white" />}
                                Add to Flash Sale
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Section A: Active Items */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Zap className="text-amber-600 fill-amber-600" size={16} />
                        </div>
                        <h2 className="font-black text-slate-900 tracking-tight">Active Flash Sale</h2>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isFull ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {activeCount}/5 Slots
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {activeItems.length > 0 ? (
                        activeItems.map((item, idx) => {
                            const p = item.shopping_products;
                            const isExpired = item.ends_at && new Date(item.ends_at) < new Date();

                            return (
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                                    {/* Product */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                                            {p?.product_images?.[0] ? (
                                                <img src={p.product_images[0]} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-slate-300" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-black text-slate-900 truncate">{p?.title || 'Unknown Product'}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-slate-400 line-through font-medium">{formatPaise(p?.mrp_paise || item.sale_price_paise * 2)}</span>
                                                <span className="text-xs text-emerald-600 font-black">{formatPaise(item.sale_price_paise)}</span>
                                                <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                                    {item.discount_percent}% OFF
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats & Controls */}
                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                Slot {item.position}/5
                                            </div>
                                            {item.ends_at && (
                                                <div className={`flex items-center gap-1 text-[10px] font-bold ${isExpired ? 'text-red-500' : 'text-amber-600'}`}>
                                                    <Clock size={12} />
                                                    {isExpired ? 'Expired' : formatDistanceToNowStrict(new Date(item.ends_at)) + ' left'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Reorder */}
                                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                            <button
                                                disabled={idx === 0 || reordering}
                                                onClick={() => handleReorder(item, 'up')}
                                                className="p-1 rounded-md hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all"
                                            >
                                                <ChevronUp size={18} />
                                            </button>
                                            <button
                                                disabled={idx === activeItems.length - 1 || reordering}
                                                onClick={() => handleReorder(item, 'down')}
                                                className="p-1 rounded-md hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all"
                                            >
                                                <ChevronDown size={18} />
                                            </button>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggle(item)}
                                                className="p-1 transition-colors text-emerald-500 hover:text-emerald-600"
                                            >
                                                {item.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-300" />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap className="text-slate-200" size={32} />
                            </div>
                            <h3 className="text-slate-900 font-bold">No active items</h3>
                            <p className="text-slate-500 text-sm mt-1">Add a product to start the flash sale</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Section C: Inactive/Expired */}
            <div className="space-y-3">
                <button
                    onClick={() => setShowInactive(!showInactive)}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <ChevronDownIcon size={14} className={`transition-transform ${showInactive ? 'rotate-180' : ''}`} />
                    Expired & Inactive ({inactiveItems.length})
                </button>

                <AnimatePresence>
                    {showInactive && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-2"
                        >
                            {inactiveItems.map(item => {
                                const p = item.shopping_products;
                                return (
                                    <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-4 group">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex-shrink-0 border border-slate-100 grayscale group-hover:grayscale-0 transition-all">
                                            {p?.product_images?.[0] ? (
                                                <img src={p.product_images[0]} className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-slate-300" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-600 truncate">{p?.title || 'Unknown'}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                {item.ends_at ? `Ended ${formatDistanceToNowStrict(new Date(item.ends_at))} ago` : 'Manually deactivated'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleReactivate(item)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 transition-colors"
                                            >
                                                <RefreshCw size={12} />
                                                Re-activate
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
