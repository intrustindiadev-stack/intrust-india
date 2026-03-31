'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Star, ShoppingBag, Loader2, ArrowRight, Package, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function StorefrontClient({ initialInventory, customer }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [isPurchasing, setIsPurchasing] = useState(null); // inventoryId
    const [wishlistIds, setWishlistIds] = useState(new Set());

    useEffect(() => {
        if (!customer) return;
        supabase
            .from('user_wishlists')
            .select('product_id')
            .eq('user_id', customer.id)
            .then(({ data }) => {
                if (data) setWishlistIds(new Set(data.map(r => r.product_id)));
            });
    }, [customer]);

    const toggleWishlist = async (item) => {
        if (!customer) {
            toast.error('Please login to save items');
            router.push('/login');
            return;
        }
        const productId = item.shopping_products.id;
        const alreadySaved = wishlistIds.has(productId);
        if (alreadySaved) {
            const { error } = await supabase
                .from('user_wishlists')
                .delete()
                .eq('user_id', customer.id)
                .eq('product_id', productId);
            if (!error) {
                setWishlistIds(prev => { const next = new Set(prev); next.delete(productId); return next; });
                toast.success('Removed from wishlist');
            }
        } else {
            const { error } = await supabase.from('user_wishlists').upsert({
                user_id: customer.id,
                product_id: productId,
                merchant_id: item.merchants?.id || null,
                inventory_id: item.id,
                is_platform_item: false,
            }, { onConflict: 'user_id,product_id' });
            if (!error) {
                setWishlistIds(prev => new Set([...prev, productId]));
                toast.success('Added to wishlist!');
            }
        }
    };

    const categories = ['All', ...new Set(initialInventory.map(i => i.shopping_products.category || 'General'))];

    const filteredItems = initialInventory.filter(item => {
        const product = item.shopping_products;
        const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             product.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'All' || product.category === activeCategory || (activeCategory === 'General' && !product.category);
        return matchesSearch && matchesCategory;
    });

    const handleBuyNow = async (inventoryId, pricePaise, productTitle) => {
        if (!customer) {
            toast.error('Please login to purchase products');
            router.push('/login');
            return;
        }

        if (customer.wallet_balance_paise < pricePaise) {
            toast.error('Insufficient wallet balance');
            return;
        }

        setIsPurchasing(inventoryId);
        try {
            const { data, error } = await supabase.rpc('customer_purchase_from_merchant', {
                p_inventory_id: inventoryId,
                p_quantity: 1,
                p_customer_id: customer.id
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.message);

            toast.success(`Purchased ${productTitle} successfully!`);
            router.refresh();
        } catch (error) {
            console.error('Purchase error:', error);
            toast.error(error.message || 'Purchase failed');
        } finally {
            setIsPurchasing(null);
        }
    };

    return (
        <div className="space-y-12">
            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-8 items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl shadow-blue-500/5">
                <div className="relative w-full lg:flex-1">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                    <input 
                        type="text" 
                        placeholder="Search for snacks, electronics, home essentials..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-16 pr-8 py-5 rounded-[2rem] bg-slate-50 border border-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-lg placeholder:text-slate-300"
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 custom-scrollbar">
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-8 py-4 rounded-[1.5rem] text-sm font-black whitespace-nowrap transition-all uppercase tracking-widest ${activeCategory === cat ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredItems.length === 0 ? (
                    <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border border-dashed border-slate-200">
                        <ShoppingBag className="mx-auto text-slate-100 mb-6" size={80} />
                        <h3 className="text-2xl font-black text-slate-400 tracking-tight">No products available in this category</h3>
                        <p className="text-slate-400 mt-2 font-medium">Try searching for something else or browse another category.</p>
                    </div>
                ) : (
                    filteredItems.map((item) => {
                        const product = item.shopping_products;
                        const merchant = item.merchants;
                        return (
                            <div key={item.id} className="group bg-white rounded-[3rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-blue-600/10 transition-all duration-500 flex flex-col hover:-translate-y-2">
                                <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
                                    {product.product_images?.[0] ? (
                                        <img src={product.product_images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                            <Package size={64} />
                                        </div>
                                    )}
                                    
                                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                                        <div className="bg-white/95 backdrop-blur px-4 py-1.5 rounded-2xl text-[10px] font-black text-blue-600 shadow-sm border border-blue-50 uppercase tracking-widest">
                                            {product.category || 'General'}
                                        </div>
                                    </div>

                                    {/* Wishlist Heart Button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleWishlist(item); }}
                                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm transition-all hover:scale-110 active:scale-95 z-10"
                                    >
                                        <Heart
                                            size={16}
                                            className={wishlistIds.has(product.id) ? 'text-pink-500' : 'text-slate-400'}
                                            fill={wishlistIds.has(product.id) ? 'currentColor' : 'none'}
                                        />
                                    </button>
                                    
                                    {/* Action Reveal Overlay */}
                                    <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
                                        <button 
                                            onClick={() => handleBuyNow(item.id, item.retail_price_paise, product.title)}
                                            disabled={isPurchasing === item.id || item.stock_quantity === 0}
                                            className="bg-white text-blue-600 px-8 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all scale-90 group-hover:scale-100 flex items-center gap-2 hover:bg-blue-600 hover:text-white"
                                        >
                                            {isPurchasing === item.id ? <Loader2 className="animate-spin" size={20} /> : <ShoppingBag size={20} />}
                                            {isPurchasing === item.id ? 'Processing...' : item.stock_quantity === 0 ? 'Out of Stock' : 'Quick Buy'}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 flex flex-col flex-1">
                                    <div className="mb-4">
                                        <h3 className="text-xl font-black text-slate-900 line-clamp-1 mb-1 tracking-tight">{product.title}</h3>
                                        <p className="text-slate-400 text-sm font-medium line-clamp-2 leading-relaxed">
                                            {product.description}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-6 border-t border-slate-50 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Retail Price</span>
                                                <span className="text-2xl font-black text-blue-600 leading-none">
                                                    ₹{(item.retail_price_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            {item.stock_quantity < 5 && item.stock_quantity > 0 && (
                                                <div className="bg-red-50 text-red-500 px-3 py-1 rounded-xl text-[10px] font-black border border-red-100 uppercase animate-pulse">
                                                    Only {item.stock_quantity} Left
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 p-4 rounded-[1.5rem] bg-slate-50 border border-slate-100 hover:border-blue-100 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm font-black text-[10px]">
                                                {merchant.business_name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-900 truncate uppercase tracking-widest leading-none mb-1">Merchant</p>
                                                <p className="text-sm font-bold text-slate-500 truncate">{merchant.business_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1 text-amber-500 mb-0.5 justify-end">
                                                    <Star size={10} fill="currentColor" />
                                                    <span className="text-[10px] font-black leading-none">{merchant.rating || 'New'}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 justify-end">
                                                    <MapPin size={8} /> Local
                                                </p>
                                            </div>
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
