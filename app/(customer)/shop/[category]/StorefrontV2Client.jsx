'use client';

import { useState, useEffect } from 'react';
import { Search, ArrowLeft, Loader2, ShoppingCart, Package, ChevronRight, BadgeCheck, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/contexts/ThemeContext';
import ProductCardV2 from './ProductCardV2';
import FloatingCart from './FloatingCart';
import { motion, AnimatePresence } from 'framer-motion';

export default function StorefrontV2Client({ category, categoryMetadata, initialInventory, customer }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [cart, setCart] = useState([]);
    const [activeSubCategory, setActiveSubCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [cartLoading, setCartLoading] = useState(false);
    const supabase = createClient();

    // Preserve User's core sync logic
    useEffect(() => {
        if (customer?.id) {
            syncCartFromDB();
        }
    }, [customer?.id]);

    const syncCartFromDB = async () => {
        setCartLoading(true);
        const { data, error } = await supabase
            .from('shopping_cart')
            .select('*')
            .eq('customer_id', customer.id);

        if (data) {
            const mappedCart = data.map(item => {
                const inventoryItem = initialInventory.find(i =>
                    item.is_platform_item
                        ? (i.product_id === item.product_id && i.is_platform_direct)
                        : (i.id === item.inventory_id)
                );
                return { ...inventoryItem, quantity: item.quantity, cart_row_id: item.id };
            });
            setCart(mappedCart);
        }
        setCartLoading(false);
    };

    const addToCart = async (item) => {
        if (!customer?.id) {
            router.push('/login');
            return;
        }

        try {
            const isPlatform = !!item.is_platform_direct;
            const { error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: customer.id,
                p_inventory_id: isPlatform ? null : item.id,
                p_product_id: item.product_id,
                p_quantity: 1,
                p_is_platform: isPlatform
            });

            if (error) throw error;
            syncCartFromDB();
        } catch (err) {
            console.error('Error adding to cart:', err);
        }
    };

    const removeFromCart = async (item) => {
        const cartItem = cart.find(i => i.id === item.id);
        if (!cartItem) return;

        try {
            if (cartItem.quantity > 1) {
                await supabase
                    .from('shopping_cart')
                    .update({ quantity: cartItem.quantity - 1 })
                    .eq('id', cartItem.cart_row_id);
            } else {
                await supabase
                    .from('shopping_cart')
                    .delete()
                    .eq('id', cartItem.cart_row_id);
            }
            syncCartFromDB();
        } catch (err) {
            console.error('Error removing from cart:', err);
        }
    };

    const subCategories = ['All', 'Premium', 'New Arrivals', 'Best Sellers', 'Trending'];

    const filteredItems = initialInventory.filter(item => {
        const matchesSearch = item.shopping_products.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSub = activeSubCategory === 'All' ||
            (activeSubCategory === 'Premium' && item.retail_price_paise > 500000) ||
            (activeSubCategory === 'New Arrivals');
        return matchesSearch && matchesSub;
    });

    const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 0), 0);
    const totalPrice = cart.reduce((acc, item) => {
        const price = item.retail_price_paise || 0;
        return acc + (price * (item.quantity || 0));
    }, 0);

    const primaryColor = categoryMetadata?.color_primary || '#3b82f6';
    const secondaryColor = categoryMetadata?.color_secondary || '#4f46e5';

    return (
        <div
            className={`relative min-h-screen transition-all duration-1000 overflow-x-hidden flex flex-col ${isDark ? 'bg-[#0a0c10]' : 'bg-white'}`}
            style={{
                background: isDark 
                    ? `linear-gradient(180deg, ${primaryColor}15 0%, ${secondaryColor}10 50%, #0a0c10 100%)`
                    : `linear-gradient(180deg, ${primaryColor}10 0%, ${secondaryColor}05 50%, white 100%)`
            }}
        >
            {/* Background Architecture */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div
                    className="absolute inset-0 opacity-[0.4]"
                    style={{ background: `radial-gradient(at 0% 0%, ${primaryColor}${isDark ? '25' : '20'} 0%, transparent 50%), radial-gradient(at 100% 0%, ${secondaryColor}${isDark ? '20' : '15'} 0%, transparent 50%)` }}
                />
                <div
                    className="absolute -top-[5%] -left-[5%] w-[110%] h-[110%] opacity-[0.4] blur-[140px] rounded-full animate-blob mix-blend-multiply"
                    style={{ background: `radial-gradient(circle, ${primaryColor}${isDark ? '40' : '50'}, transparent 70%)` }}
                />
                <div className={`absolute inset-0 backdrop-blur-[120px] ${isDark ? 'bg-black/40' : 'bg-white/[0.01]'}`} />
            </div>

            <div className={`fixed inset-0 pointer-events-none -z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] ${isDark ? 'opacity-[0.03]' : 'opacity-[0.015]'}`} />

            {/* Structured Top Fold - Anchors the experience */}
            <div className="w-full pt-44 pb-16 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Storefront</span>
                                <ChevronRight size={10} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] italic ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{category}</span>
                            </div>
                            <h1 className={`text-6xl md:text-9xl font-black tracking-tighter leading-none italic uppercase mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {category} <span className={isDark ? 'text-slate-800' : 'text-slate-100'}>/</span>
                            </h1>
                            <p className={`${isDark ? 'text-slate-500' : 'text-slate-400'} font-bold italic text-sm tracking-widest pl-1 uppercase`}>Boutique Node Selection</p>
                        </div>
                        <div className={`flex items-center gap-10 border-l pl-10 hidden md:flex h-fit py-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <div className="flex flex-col">
                                <span className={`text-[9px] font-black uppercase tracking-widest italic mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Asset Volume</span>
                                <span className={`text-3xl font-black italic leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>{initialInventory.length} <span className="text-[10px] text-slate-500 uppercase tracking-tight font-black">Units</span></span>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[9px] font-black uppercase tracking-widest italic mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Verification</span>
                                <div className="flex items-center gap-2 text-emerald-500">
                                    <BadgeCheck size={18} />
                                    <span className="text-xl font-black uppercase tracking-tighter italic leading-none">Vetted</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Smart Sticky Filter Bar - Matched to Navbar Width */}
            <header className="sticky top-24 md:top-28 z-40 w-[90%] md:w-[85%] max-w-6xl mx-auto mb-16 px-0 transition-all duration-300">
                <div className={`backdrop-blur-[40px] rounded-[2.5rem] border shadow-2xl p-2 md:p-3 overflow-hidden ${isDark ? 'bg-slate-900/40 border-slate-800/60 shadow-black/40' : 'bg-white/40 border-white/50 shadow-slate-200/40'}`}>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                            <button
                                onClick={() => router.push('/shop')}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl shadow-sm border flex items-center justify-center transition-all hover:scale-105 active:scale-95 group shrink-0 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-100 text-slate-400 hover:text-slate-900'}`}
                            >
                                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            </button>
                            <div className={`h-8 w-px mx-1 shrink-0 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                            {subCategories.map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => setActiveSubCategory(sub)}
                                    className={`px-6 py-2.5 md:py-3.5 rounded-[1.2rem] text-[10px] md:text-xs font-black whitespace-nowrap transition-all uppercase tracking-widest border-2 ${activeSubCategory === sub
                                        ? 'text-white'
                                        : isDark ? 'bg-slate-800/40 text-slate-500 border-transparent hover:border-slate-700 hover:text-slate-300' : 'bg-white/40 text-slate-400 border-transparent hover:border-white/60 hover:text-slate-600'
                                        }`}
                                    style={activeSubCategory === sub ? {
                                        backgroundColor: primaryColor,
                                        borderColor: primaryColor,
                                        boxShadow: `0 12px 24px -8px ${primaryColor}${isDark ? '60' : '40'}`
                                    } : {}}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 md:gap-4 ml-auto">
                            <div className={`hidden lg:flex items-center rounded-2xl px-5 py-3 border focus-within:shadow-xl transition-all w-64 ${isDark ? 'bg-slate-950/40 border-slate-800/40 focus-within:bg-slate-950/80 focus-within:border-slate-700' : 'bg-slate-900/5 border-white/50 focus-within:bg-white focus-within:border-slate-200'}`}>
                                <Search size={14} className="text-slate-500 mr-3" />
                                <input
                                    type="text"
                                    placeholder="SEARCH NODE..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`bg-transparent border-none outline-none text-[10px] font-black w-full placeholder:text-slate-600 uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}
                                />
                            </div>

                            <div className={`pl-5 pr-2 py-2 rounded-[1.6rem] flex items-center gap-3 shadow-xl ${isDark ? 'bg-white text-slate-950' : 'bg-slate-950 text-white'}`}>
                                <div className="hidden sm:block">
                                    <p className={`text-[10px] font-black tracking-tight leading-none italic uppercase mb-0.5 opacity-60`}>VAULT</p>
                                    <p className="text-xs font-black tracking-tight leading-none">₹{(totalPrice / 100).toLocaleString('en-IN')}</p>
                                </div>
                                <div className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center relative ${isDark ? 'bg-slate-100' : 'bg-white/10'}`}>
                                    <ShoppingCart size={18} className={isDark ? 'text-slate-950' : 'text-white'} />
                                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center border-2 ${isDark ? 'bg-slate-950 text-white border-white' : 'bg-white text-slate-950 border-slate-950'}`}>
                                        {totalItems || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Product Discovery Grid */}
            <div className="w-full px-6 flex-1">
                <div className="max-w-6xl mx-auto pb-32">
                    {filteredItems.length === 0 ? (
                        <div className={`py-32 text-center rounded-[3rem] border-2 border-dashed ${isDark ? 'border-slate-800 bg-slate-900/20' : 'border-slate-100 bg-slate-50/20'}`}>
                            <Package className={`mx-auto mb-6 ${isDark ? 'text-slate-800' : 'text-slate-200'}`} size={64} strokeWidth={1} />
                            <h3 className={`text-2xl font-black uppercase italic tracking-widest ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>Selection Empty</h3>
                            <p className="text-slate-500 font-bold italic mt-2">No assets match your current filtering criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
                            <AnimatePresence mode="popLayout">
                                {filteredItems.map(item => (
                                    <ProductCardV2
                                        key={item.id}
                                        item={item}
                                        cartItem={cart.find(i => i.id === item.id)}
                                        onAdd={() => addToCart(item)}
                                        onRemove={() => removeFromCart(item)}
                                        primaryColor={primaryColor}
                                        secondaryColor={secondaryColor}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* PERSISTENT HUB CART */}
            {totalItems > 0 && (
                <FloatingCart
                    count={totalItems}
                    total={totalPrice}
                    items={cart}
                    customer={customer}
                    onClear={() => setCart([])}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                />
            )}
        </div>
    );
}
