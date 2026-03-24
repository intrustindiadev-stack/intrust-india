'use client';

import { useState } from 'react';
import {
    ChevronLeft,
    ShoppingCart,
    ShieldCheck,
    Truck,
    Store,
    Plus,
    Minus,
    Loader2,
    Package,
    ArrowRight,
    Sparkles,
    CheckCircle2,
    MapPin,
    BadgeCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetailClient({ product, inventory, customer }) {
    const router = useRouter();
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    // Determine the "best" offer (platform or cheapest merchant)
    const platformOffer = {
        is_platform_direct: true,
        retail_price_paise: product.suggested_retail_price_paise,
        merchant_name: 'InTrust Official',
        stock: product.admin_stock
    };

    const allOffers = [
        platformOffer,
        ...inventory.map(inv => ({
            id: inv.id,
            is_platform_direct: false,
            retail_price_paise: inv.retail_price_paise,
            merchant_name: inv.merchants?.business_name || 'Merchant',
            merchant_location: inv.merchants?.business_address || '',
            stock: inv.stock_quantity
        }))
    ].filter(o => o.stock > 0).sort((a, b) => a.retail_price_paise - b.retail_price_paise);

    const selectedOffer = allOffers[0] || platformOffer;

    const addToCart = async () => {
        if (!customer) {
            toast.error('Please login to add to cart');
            router.push('/login');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('add_to_shopping_cart', {
                p_customer_id: customer.id,
                p_inventory_id: selectedOffer.is_platform_direct ? null : selectedOffer.id,
                p_product_id: product.id,
                p_quantity: quantity,
                p_is_platform: selectedOffer.is_platform_direct
            });

            if (error) throw error;
            toast.success('Added to cart!');
            router.refresh();
        } catch (err) {
            console.error('Add to cart error:', err);
            toast.error('Failed to add to cart');
        } finally {
            setLoading(false);
        }
    };

    const primaryColor = product.shopping_categories?.color_primary || '#3b82f6';
    const secondaryColor = product.shopping_categories?.color_secondary || '#4f46e5';

    return (
        <div className="relative min-h-screen transition-all duration-1000 overflow-x-hidden">
            {/* Immersive Nebula Background - High Vibrancy */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-white" />
                <div 
                    className="absolute -top-[10%] -left-[10%] w-[100%] h-[100%] opacity-[0.25] blur-[150px] rounded-full animate-blob mix-blend-multiply" 
                    style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}
                />
                <div 
                    className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] opacity-[0.2] blur-[130px] rounded-full animate-blob delay-4000 mix-blend-multiply" 
                    style={{ background: `radial-gradient(circle, ${secondaryColor} 0%, transparent 70%)` }}
                />
                <div className="absolute inset-0 backdrop-blur-[120px] bg-white/40" />
            </div>

            {/* Premium Mesh Texture */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none -z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

            <div className="max-w-7xl mx-auto px-4 md:px-8 relative pt-24 pb-32">
                {/* Back Button - Premium Glass */}
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => router.back()}
                    className="mb-10 flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-all font-black text-xs uppercase tracking-[0.2em] group bg-white/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/50 shadow-sm"
                >
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" strokeWidth={3} />
                   Back to Store
                </motion.button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                    {/* Left: Product Showcase Section */}
                    <div className="lg:col-span-7 space-y-10">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="aspect-square bg-white/40 backdrop-blur-3xl rounded-[4rem] p-12 md:p-20 relative overflow-hidden group border border-white/80 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.05)]"
                        >
                            {/* Inner Glow and Effects */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                            <div 
                                className="absolute -top-32 -left-32 w-64 h-64 blur-3xl opacity-10 rounded-full" 
                                style={{ background: primaryColor }}
                            />

                            {product.image_url ? (
                                <img
                                    src={product.image_url}
                                    alt={product.title}
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-1000 ease-out"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                                    <Package size={140} strokeWidth={0.5} />
                                    <span className="mt-6 font-black uppercase tracking-[0.3em] text-[10px]">No Asset Found</span>
                                </div>
                            )}

                            {/* Floating Metadata Badges */}
                            <div className="absolute top-10 left-10 flex flex-col gap-3">
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-slate-950 text-white px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2"
                                >
                                    <Sparkles size={12} className="text-yellow-400" />
                                    Verified Choice
                                </motion.div>
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-white/90 backdrop-blur px-5 py-2.5 rounded-2xl text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] border border-slate-100 shadow-sm"
                                >
                                    {product.shopping_categories?.name || 'Collection Item'}
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* High-End Feature Grid */}
                        <div className="grid grid-cols-3 gap-6">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-white/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/60 text-center shadow-xl shadow-slate-200/20 group hover:-translate-y-2 transition-all"
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-50 group-hover:scale-110 transition-transform">
                                    <Truck className="text-slate-900" size={20} />
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Global Shipping</p>
                                <p className="text-xs font-black text-slate-900 italic">Curated Delivery</p>
                            </motion.div>
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="bg-white/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/60 text-center shadow-xl shadow-slate-200/20 group hover:-translate-y-2 transition-all"
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-50 group-hover:scale-110 transition-transform">
                                    <ShieldCheck className="text-emerald-600" size={20} />
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">InTrust Care</p>
                                <p className="text-xs font-black text-slate-900 italic">100% Assurance</p>
                            </motion.div>
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                className="bg-white/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/60 text-center shadow-xl shadow-slate-200/20 group hover:-translate-y-2 transition-all"
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-50 group-hover:scale-110 transition-transform">
                                    <Store className="text-indigo-600" size={20} />
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Node Access</p>
                                <p className="text-xs font-black text-slate-900 italic">Boutique Pickup</p>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right: Premium Information Section */}
                    <div className="lg:col-span-5 flex flex-col pt-4">
                        <div className="sticky top-40">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-12"
                            >
                                <div className="flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em] mb-6 italic">
                                    <span className="w-10 h-[2px] bg-emerald-600/20 rounded-full" />
                                    The Boutique Selection
                                </div>
                                <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter leading-[0.85] mb-8 italic">
                                    {product.title}
                                </h1>
                                <p className="text-slate-500 text-lg md:text-xl leading-relaxed font-bold italic opacity-80 max-w-lg">
                                    {product.description || 'Elevate your standards with this meticulously vetted selection. Designed for those who seek the intersection of performance and aesthetics.'}
                                </p>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white/40 backdrop-blur-[50px] rounded-[3.5rem] p-10 md:p-12 border border-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] mb-10 relative overflow-hidden"
                            >
                                {/* Inner Card Glow */}
                                <div 
                                    className="absolute -top-20 -right-20 w-40 h-40 blur-3xl opacity-10 rounded-full" 
                                    style={{ background: secondaryColor }}
                                />

                                <div className="flex flex-col md:flex-row items-baseline justify-between gap-6 mb-12 relative z-10">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 italic">Acquisition Value</p>
                                        <h2 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter leading-none italic">
                                            ₹{(selectedOffer.retail_price_paise / 100).toLocaleString('en-IN')}
                                        </h2>
                                    </div>
                                    <div className="md:text-right bg-emerald-50 md:bg-transparent px-4 py-2 rounded-xl md:p-0">
                                        <div className="flex items-center md:justify-end gap-2 text-emerald-500 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-[10px] font-black uppercase tracking-widest italic leading-none">High Demand</p>
                                        </div>
                                        <p className="text-xs font-black text-slate-950 italic">Only {selectedOffer.stock} Units Remaining</p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-6 mb-12 relative z-10">
                                    <div className="flex items-center bg-white/60 p-2 rounded-[2rem] border border-white shadow-inner">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-14 h-14 flex items-center justify-center bg-white shadow-xl shadow-slate-200/20 border border-slate-50 rounded-2xl text-slate-400 hover:text-slate-950 transition-all active:scale-90"
                                        >
                                            <Minus size={20} strokeWidth={4} />
                                        </button>
                                        <span className="w-14 text-center font-black text-2xl italic text-slate-950">
                                            {quantity}
                                        </span>
                                        <button
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-14 h-14 flex items-center justify-center bg-white shadow-xl shadow-slate-200/20 border border-slate-50 rounded-2xl text-slate-400 hover:text-slate-950 transition-all active:scale-90"
                                        >
                                            <Plus size={20} strokeWidth={4} />
                                        </button>
                                    </div>

                                    <div className="flex-1 w-full sm:w-auto">
                                        <button
                                            onClick={addToCart}
                                            disabled={loading}
                                            className="w-full bg-slate-950 text-white h-18 rounded-[2.2rem] font-black uppercase tracking-[0.3em] text-[11px] italic flex items-center justify-center gap-4 hover:bg-black transition-all shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] active:scale-95 disabled:opacity-50 group py-6"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={24} /> : (
                                                <>
                                                    <ShoppingCart size={20} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
                                                    Add to Selection
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Merchant Module - Ultra Premium */}
                                <div className="pt-10 border-t border-slate-900/5 flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-[1.8rem] bg-slate-950/5 flex items-center justify-center text-slate-400 border border-white shadow-inner relative group/merchant">
                                            <Store size={24} strokeWidth={1.5} />
                                            <div className="absolute -top-2 -right-2 bg-slate-950 text-white p-1.5 rounded-full shadow-xl">
                                                <BadgeCheck size={12} className="text-yellow-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2 italic">Verified Boutique Node</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xl font-black text-slate-950 italic">{selectedOffer.merchant_name}</p>
                                                <div className="px-2 py-0.5 bg-emerald-50 rounded-md">
                                                    <p className="text-[8px] font-black text-emerald-600 uppercase italic">Pro Merchant</p>
                                                </div>
                                            </div>
                                            {selectedOffer.merchant_location && (
                                                <div className="flex items-center gap-2 mt-2 opacity-60">
                                                    <MapPin size={10} className="text-slate-400" />
                                                    <p className="text-[10px] font-bold text-slate-500 truncate max-w-[180px] italic">{selectedOffer.merchant_location}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-950 font-black text-[9px] uppercase tracking-[0.2em] flex items-center gap-2 transition-colors italic hidden sm:flex border border-slate-100 px-4 py-2 rounded-xl bg-white/50">
                                        Merchant Protocol <ArrowRight size={12} />
                                    </button>
                                </div>
                            </motion.div>

                            {/* Trust Protocol Bar */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="flex items-center justify-center gap-10 py-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700"
                            >
                                <div className="flex flex-col items-center gap-2">
                                     <CheckCircle2 size={18} />
                                     <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-900">Verified Origin</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <div className="flex flex-col items-center gap-2">
                                     <ShieldCheck size={18} />
                                     <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-900">SSL Encrypted</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                <div className="flex flex-col items-center gap-2">
                                     <ArrowRight size={18} />
                                     <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-900">Global Logistics</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
