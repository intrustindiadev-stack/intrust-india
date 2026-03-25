'use client';

import { useState } from 'react';
import { ShoppingCart, Package, Plus, Minus, Trash2, Loader2, CheckCircle2, Tags } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WholesaleClient({ products = [], merchant, categories = [] }) {
    const router = useRouter();
    const [cart, setCart] = useState({}); // { productId: quantity }
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');

    const updateQuantity = (productId, delta, maxStock) => {
        setCart(prev => {
            const currentQty = prev[productId] || 0;
            const newQty = Math.max(0, Math.min(maxStock, currentQty + delta));
            
            if (newQty === 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: newQty };
        });
    };

    const cartItems = Object.entries(cart).map(([id, qty]) => {
        const product = products.find(p => p.id === id);
        return { ...product, quantity: qty };
    });

    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.wholesale_price_paise) * item.quantity), 0);
    const subtotalInRupees = subtotal / 100;
    const merchantBalance = merchant.wallet_balance_paise / 100;

    const handlePurchase = async () => {
        if (cartItems.length === 0) return;
        if (subtotalInRupees > merchantBalance) {
            toast.error('Insufficient balance in your wallet');
            return;
        }

        setIsPurchasing(true);
        try {
            // Prepare payload for bulk RPC
            const payload = cartItems.map(item => ({
                product_id: item.id,
                quantity: item.quantity
            }));

            const { data, error } = await supabase.rpc('purchase_platform_products_bulk', {
                p_items: payload,
                p_merchant_id: merchant.id
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.message);

            toast.success('All items purchased successfully!');
            setCart({});
            router.refresh();
        } catch (error) {
            console.error('Purchase error:', error);
            toast.error(error.message || 'Purchase failed');
        } finally {
            setIsPurchasing(false);
        }
    };

    const filteredProducts = selectedCategory === 'All' 
        ? products 
        : products.filter(p => p.category === selectedCategory);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            {/* Main Content Area */}
            <div className="xl:col-span-2 space-y-8">

                {/* Tab Bar */}
                <div className="flex items-center gap-3">
                    <span className="whitespace-nowrap px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-900 text-white shadow-xl shadow-slate-900/20">
                        Buy Stock
                    </span>
                    <Link
                        href="/merchant/shopping/wholesale/history"
                        className="whitespace-nowrap px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all"
                    >
                        Purchase History
                    </Link>
                </div>

                {/* Category Filters */}
                {categories.length > 0 && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar">
                        <button
                            onClick={() => setSelectedCategory('All')}
                            className={`whitespace-nowrap px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                selectedCategory === 'All' 
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            All Categories
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`whitespace-nowrap px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                                    selectedCategory === cat.name 
                                    ? `bg-white text-slate-900 shadow-xl shadow-blue-900/5 ring-2 ring-slate-900 ring-offset-2 ring-offset-[#f8f9fb]` 
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${cat.color_gradient}`} />
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    {filteredProducts.length === 0 ? (
                        <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                            <Package className="mx-auto text-slate-200 mb-6" size={64} />
                            <h3 className="text-xl font-black text-slate-900 mb-2">No products found</h3>
                            <p className="text-slate-500 font-medium">Try selecting a different category.</p>
                        </div>
                    ) : (
                        filteredProducts.map((product) => {
                            const categoryDetails = categories.find(c => c.name === product.category);
                            const gradientClass = categoryDetails?.color_gradient || 'from-slate-100 to-slate-200';

                            return (
                                <div key={product.id} className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-600/10 transition-all duration-500 flex flex-col group">
                                    <div className={`aspect-square rounded-[2rem] relative overflow-hidden mb-6 bg-gradient-to-br ${gradientClass} p-1`}>
                                        <div className="w-full h-full bg-white rounded-[1.8rem] overflow-hidden relative">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            ) : (
                                                <div className={`w-full h-full bg-gradient-to-br ${gradientClass} opacity-10 flex items-center justify-center`}>
                                                    <Package size={64} className="text-slate-400 opacity-50" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-lg border border-white/20">
                                            {product.category || 'Standard'}
                                        </div>
                                    </div>

                                    <div className="px-2 flex-1 flex flex-col">
                                        <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight line-clamp-1">{product.title}</h3>
                                        <p className="text-slate-500 text-sm font-medium mb-6 line-clamp-2 leading-relaxed flex-1">{product.description}</p>
                                        
                                        <div className="flex items-end justify-between mb-6 p-4 rounded-3xl bg-slate-50 border border-slate-100">
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Wholesale Price</p>
                                                <p className="text-2xl font-black text-blue-600 tracking-tight">₹{(product.wholesale_price_paise / 100).toLocaleString('en-IN')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Retail Value</p>
                                                <p className="text-sm font-bold text-slate-400">₹{(product.suggested_retail_price_paise / 100).toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 px-2">
                                            <div className="flex items-center gap-1 bg-[#1e3a5f] p-1 rounded-2xl shadow-xl shadow-blue-900/10">
                                                <button 
                                                    onClick={() => updateQuantity(product.id, -1, product.admin_stock)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white transition-colors"
                                                >
                                                    <Minus size={18} />
                                                </button>
                                                <span className="w-8 text-center font-black text-white text-lg">{cart[product.id] || 0}</span>
                                                <button 
                                                    onClick={() => updateQuantity(product.id, 1, product.admin_stock)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white transition-colors"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">
                                                <span className="text-slate-900">{product.admin_stock}</span><br />Available
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Sidebar Cart */}
            <div className="xl:col-span-1">
                <div className="bg-[#1e3a5f] rounded-[2.5rem] p-8 text-white sticky top-24 shadow-2xl shadow-blue-900/20 overflow-hidden border border-blue-800">
                    {/* Interior glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-end justify-between mb-10">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">
                                    Order Slip
                                </h2>
                                <p className="text-blue-300/70 text-xs font-bold uppercase tracking-widest">
                                    {cartItems.length} Unique Items
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center backdrop-blur-md">
                                <ShoppingCart size={20} className="text-blue-300" />
                            </div>
                        </div>

                        {cartItems.length === 0 ? (
                            <div className="py-16 text-center border border-dashed border-white/10 rounded-[2rem] bg-white/5 backdrop-blur-sm">
                                <Tags className="mx-auto text-white/20 mb-4" size={48} />
                                <p className="text-white/40 text-sm font-bold px-8">Add items to your cart to restock your inventory.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between group bg-white/5 hover:bg-white/10 p-4 rounded-2xl transition-colors border border-white/5">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="font-bold text-sm text-white truncate mb-1">{item.title}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                                                    ₹{(item.wholesale_price_paise / 100).toLocaleString()} × {item.quantity}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-black text-white">₹{((item.wholesale_price_paise * item.quantity) / 100).toLocaleString()}</p>
                                                <button 
                                                    onClick={() => updateQuantity(item.id, -item.quantity, item.admin_stock)}
                                                    className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-8 border-t border-white/10 space-y-6">
                                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-md">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-blue-300/70 uppercase tracking-widest">Total Payable</span>
                                            {subtotalInRupees > merchantBalance && (
                                                <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">Low Balance</span>
                                            )}
                                        </div>
                                        <div className="text-4xl font-black text-white tracking-tight">₹{subtotalInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                    </div>

                                    <button
                                        onClick={handlePurchase}
                                        disabled={isPurchasing || cartItems.length === 0 || subtotalInRupees > merchantBalance}
                                        className="w-full bg-white hover:bg-blue-50 disabled:bg-white/10 disabled:text-white/20 text-[#1e3a5f] py-5 rounded-[1.5rem] font-black text-lg shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        {isPurchasing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                <span>Processing Transaction...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={24} />
                                                <span>Confirm Payment</span>
                                            </>
                                        )}
                                    </button>
                                    
                                    {subtotalInRupees > merchantBalance && (
                                        <Link 
                                            href="/merchant/wallet"
                                            className="block text-center text-xs font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
                                        >
                                            Add ₹{(subtotalInRupees - merchantBalance).toLocaleString()} Top Up
                                        </Link>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
