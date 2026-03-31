'use client';

import { useState } from 'react';
import { Search, Edit3, Tag, Box, Info, Store, ShoppingBag, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MerchantInventoryClient({ initialInventory, merchant }) {
    const router = useRouter();
    const [inventory, setInventory] = useState(initialInventory);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, platform, custom
    const [isUpdating, setIsUpdating] = useState(null); // id of product being updated

    const filteredInventory = inventory.filter(item => {
        const product = item.shopping_products;
        const title = item.custom_title || product.title;
        const category = product.category;
        
        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (category && category.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFilter = filterType === 'all' || 
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
            
            setInventory(prev => prev.map(item => 
                item.id === itemId ? { ...item, is_active: !currentStatus } : item
            ));
            toast.success(currentStatus ? 'Unpublished from shop' : 'Published to shop');
        } catch (error) {
            toast.error('Failed to update visibility');
        } finally {
            setIsUpdating(null);
        }
    };

    /**
     * Stock update route — guarded server-side.
     * Platform products are rejected by the RPC; only custom products can be updated.
     */
    const handleUpdateStock = async (item, newStock) => {
        if (newStock < 0 || isNaN(newStock)) return;

        // Prevent even sending the request for platform products — the UI shouldn't
        // offer the input, but this is a last-resort client guard.
        if (item.is_platform_product) {
            toast.error('Platform product stock is managed via Wholesale. Please restock there.');
            return;
        }

        try {
            const { data, error } = await supabase.rpc('update_merchant_inventory_stock', {
                p_inventory_id: item.id,
                p_new_stock: newStock,
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.message);

            setInventory(prev => prev.map(i => 
                i.id === item.id ? { ...i, stock_quantity: newStock } : i
            ));
            toast.success('Stock updated');

            if (newStock <= 5) {
                const title = item.custom_title || item.shopping_products.title;
                supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: 'Low Stock Alert',
                    body: `Only ${newStock} units left for ${title}. Restock soon to avoid losing sales.`,
                    type: 'warning',
                    reference_id: item.id,
                    reference_type: 'merchant_inventory'
                }).then(({ error: notifError }) => {
                    if (notifError) console.error('Failed to insert low stock notification:', notifError);
                });
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update stock');
        }
    };

    const handleUpdatePrice = async (itemId, newPriceRupees) => {
        const pricePaise = Math.round(parseFloat(newPriceRupees) * 100);
        if (isNaN(pricePaise) || pricePaise < 0) return;
        
        try {
            const { error } = await supabase
                .from('merchant_inventory')
                .update({ retail_price_paise: pricePaise })
                .eq('id', itemId);

            if (error) throw error;
            
            setInventory(prev => prev.map(item => 
                item.id === itemId ? { ...item, retail_price_paise: pricePaise } : item
            ));
            toast.success('Price updated');
        } catch (error) {
            toast.error('Failed to update price');
        }
    };

    return (
        <div className="space-y-10">
            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                <div className="relative w-full lg:max-w-xl">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search your inventory by name or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 rounded-[2rem] border-2 border-white focus:border-blue-100 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900"
                    />
                </div>
                
                <div className="flex items-center p-1.5 bg-white/80 backdrop-blur-xl rounded-[2rem] w-full lg:w-auto shadow-xl shadow-slate-200/50 border border-white">
                    <button 
                        onClick={() => setFilterType('all')}
                        className={`flex-1 lg:flex-none px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-[#1e3a5f] shadow-lg shadow-blue-900/20 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        All Items
                    </button>
                    <button 
                        onClick={() => setFilterType('platform')}
                        className={`flex-1 lg:flex-none px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${filterType === 'platform' ? 'bg-[#1e3a5f] shadow-lg shadow-blue-900/20 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Platform
                    </button>
                    <button 
                        onClick={() => setFilterType('custom')}
                        className={`flex-1 lg:flex-none px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${filterType === 'custom' ? 'bg-[#1e3a5f] shadow-lg shadow-blue-900/20 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Custom
                    </button>
                </div>
            </div>

            {/* Inventory List */}
            <div className="space-y-6">
                {filteredInventory.length === 0 ? (
                    <div className="py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-300 shadow-sm">
                        <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                            <Box className="text-slate-300" size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Catalog is Empty</h3>
                        <p className="text-slate-500 mt-2 font-medium max-w-sm mx-auto">You haven't added any products to your shop yet. Try sourcing from the wholesale market.</p>
                    </div>
                ) : (
                    filteredInventory.map((item) => {
                        const product = item.shopping_products;
                        const isUpdatingThis = isUpdating === item.id;
                        const isPlatform = item.is_platform_product;
                        
                        return (
                            <div key={item.id} className={`bg-white rounded-[2.5rem] border shadow-xl transition-all duration-500 overflow-visible ${item.is_active ? 'border-slate-100 shadow-slate-200/40 hover:shadow-blue-600/5' : 'border-slate-200 opacity-75 bg-slate-50/50 shadow-none grayscale-[0.2]'}`}>
                                <div className="flex flex-col xl:flex-row p-6 lg:p-8 gap-8">
                                    {/* Product Info */}
                                    <div className="flex gap-8 flex-1 min-w-0 items-center">
                                        <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-slate-100 to-slate-200 shrink-0 overflow-hidden relative shadow-inner p-1">
                                            <div className="w-full h-full bg-white rounded-[1.8rem] overflow-hidden relative group">
                                                {product.product_images?.[0] ? (
                                                    <img src={product.product_images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                                        <Store size={40} />
                                                    </div>
                                                )}
                                                {!item.is_active && (
                                                    <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center">
                                                        <span className="bg-white/90 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">Draft</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-2xl font-black text-slate-900 truncate tracking-tight">
                                                    {item.custom_title || product.title}
                                                </h3>
                                                {isPlatform ? (
                                                    <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                        <Box size={12} /> Platform
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-lg bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                        <Tag size={12} /> Custom
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <p className="text-slate-500 font-medium line-clamp-2 mb-4 max-w-2xl leading-relaxed">
                                                {item.custom_description || product.description}
                                            </p>
                                            
                                            <div className="flex flex-wrap gap-4 items-center">
                                                <div className="flex items-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Category:</span>
                                                    <span className="text-sm font-bold text-slate-900">{product.category || 'General'}</span>
                                                </div>
                                                {isPlatform && (
                                                    <div className="flex items-center px-4 py-2 rounded-xl bg-blue-50/50 border border-blue-100/50">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mr-2">Cost Price:</span>
                                                        <span className="text-sm font-black text-blue-700">₹{(product.wholesale_price_paise / 100).toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Controls Area */}
                                    <div className="flex flex-col sm:flex-row items-center gap-6 xl:border-l xl:border-slate-100 xl:pl-10">
                                        
                                        {/* Selling Price Editor */}
                                        <div className="space-y-2 w-full sm:w-auto">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
                                                Retail Price
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            </label>
                                            <div className="relative group/price">
                                                <div className="absolute left-1 top-1 bottom-1 w-10 flex items-center justify-center bg-slate-100 rounded-xl text-slate-500 font-black">
                                                    ₹
                                                </div>
                                                <input 
                                                    type="number" 
                                                    defaultValue={item.retail_price_paise / 100}
                                                    onBlur={(e) => handleUpdatePrice(item.id, e.target.value)}
                                                    className="w-full sm:w-36 pl-14 pr-4 py-3 rounded-xl bg-white border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-slate-900 text-lg shadow-sm hover:border-slate-200"
                                                />
                                            </div>
                                        </div>

                                        {/* Stock - conditional by product type */}
                                        <div className="space-y-2 w-full sm:w-auto">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                                                {isPlatform ? 'Stock' : 'Local Stock'}
                                            </label>

                                            {isPlatform ? (
                                                /* Platform product: read-only display + restock hint */
                                                <div className="flex flex-col gap-2">
                                                    <div className={`w-full sm:w-32 px-5 py-3 rounded-xl border-2 text-lg font-black text-center select-none ${item.stock_quantity <= 5 ? 'border-amber-200 text-amber-700 bg-amber-50/30' : 'border-slate-100 bg-slate-50 text-slate-700'}`}>
                                                        {item.stock_quantity}
                                                        {item.stock_quantity <= 5 && (
                                                            <span className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mt-0.5">Low</span>
                                                        )}
                                                    </div>
                                                    <Link
                                                        href="/merchant/shopping/wholesale"
                                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest transition-all group/ws"
                                                    >
                                                        <ShoppingBag size={12} />
                                                        Restock via Wholesale
                                                        <ArrowRight size={10} className="group-hover/ws:translate-x-0.5 transition-transform" />
                                                    </Link>
                                                </div>
                                            ) : (
                                                /* Custom product: editable stock input */
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        defaultValue={item.stock_quantity}
                                                        onBlur={(e) => handleUpdateStock(item, parseInt(e.target.value))}
                                                        className={`w-full sm:w-32 px-5 py-3 rounded-xl bg-white border-2 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-lg text-center shadow-sm hover:border-slate-200 ${item.stock_quantity <= 5 ? 'border-amber-200 text-amber-700 bg-amber-50/30' : 'border-slate-100 text-slate-900'}`}
                                                    />
                                                    {item.stock_quantity <= 5 && (
                                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse ring-4 ring-amber-50" />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Toggle Action */}
                                        <div className="mt-6 sm:mt-0 xl:ml-6 flex items-center">
                                            <button 
                                                onClick={() => handleToggleActive(item.id, item.is_active)}
                                                disabled={isUpdatingThis}
                                                className={`w-full sm:w-auto px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 relative overflow-hidden group ${
                                                    item.is_active 
                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 shadow-red-500/10 hover:shadow-red-500/20' 
                                                    : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20 hover:shadow-emerald-500/30 ring-2 ring-emerald-500 ring-offset-2 ring-offset-white'
                                                }`}
                                            >
                                                {isUpdatingThis ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                        Saving...
                                                    </span>
                                                ) : item.is_active ? 'Depublish' : 'Publish Live'}
                                                
                                                {!item.is_active && (
                                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                                )}
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
