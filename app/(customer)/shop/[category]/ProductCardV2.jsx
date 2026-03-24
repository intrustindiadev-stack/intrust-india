'use client';

import { Plus, Minus, Clock, Package, ShieldCheck, BadgeCheck, Sparkles, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { motion } from 'framer-motion';

export default function ProductCardV2({ item, cartItem, onAdd, onRemove, primaryColor = '#000000', secondaryColor = '#1e293b' }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const product = item.shopping_products;
    const price = (item.retail_price_paise || 0) / 100;

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -6 }}
            className="group relative flex flex-col h-full"
        >
            {/* Tonal Card Base - Dynamic Theme Support */}
            <div className={`absolute inset-0 rounded-[2.5rem] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.02)] transition-all duration-500 group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] ${isDark ? 'bg-slate-900/40 backdrop-blur-3xl border border-slate-800/50 group-hover:bg-slate-900 shadow-black/40' : 'bg-white/40 backdrop-blur-2xl border border-white group-hover:bg-white shadow-slate-200/40'}`} />
            
            <div className="relative p-3 flex flex-col h-full z-10">
                {/* Image Container - The "Raised" Surface */}
                <div 
                    onClick={() => router.push(`/shop/product/${item.product_id}`)}
                    className={`aspect-square rounded-[2rem] overflow-hidden relative cursor-pointer shadow-sm transition-all duration-700 group-hover:shadow-xl group-hover:scale-[1.02] ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-slate-50'}`}
                >
                    {product.image_url ? (
                        <img 
                            src={product.image_url} 
                            alt={product.title} 
                            className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                            <Package size={32} strokeWidth={1} className={isDark ? 'text-slate-700' : 'text-slate-200'} />
                        </div>
                    )}
                    
                    {/* Ambient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                    
                    {/* Floating Indicators */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <div className={`backdrop-blur-md px-3 py-1.5 rounded-xl border shadow-sm flex items-center gap-1.5 transition-transform duration-500 group-hover:translate-x-1 ${isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white/80 border-white/50'}`}>
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className={`text-[8px] font-black uppercase tracking-widest italic leading-none ${isDark ? 'text-slate-300' : 'text-slate-950'}`}>Vetted Slot</span>
                        </div>
                    </div>

                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 text-white">
                        <div className={`backdrop-blur-md p-2 rounded-xl shadow-xl ${isDark ? 'bg-slate-800/80' : 'bg-slate-950/80'}`}>
                            <Sparkles size={12} className="text-yellow-400" />
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="mt-5 pb-2 px-1 flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                            <BadgeCheck size={12} className="text-emerald-500" />
                            <span className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Auth Protocol</span>
                        </div>
                        <span className={`text-[9px] font-black opacity-60 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>HUB-{item.id?.slice(0, 4)}</span>
                    </div>

                    <h3 
                        onClick={() => router.push(`/shop/product/${item.product_id}`)}
                        className={`text-sm md:text-base font-black leading-[1.2] mb-4 line-clamp-2 italic h-[2.4rem] cursor-pointer transition-colors ${isDark ? 'text-white hover:text-slate-200' : 'text-slate-900 hover:text-slate-950'}`}
                    >
                        {item.custom_title || product.title}
                    </h3>
                    
                    <div className={`mt-auto pt-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 opacity-60 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Value</span>
                            <span className={`text-xl font-black tracking-tighter italic ${isDark ? 'text-white' : 'text-slate-950'}`}>₹{price.toLocaleString('en-IN')}</span>
                        </div>

                        {cartItem ? (
                            <div className={`flex items-center p-1 rounded-2xl shadow-xl ${isDark ? 'bg-white text-slate-950' : 'bg-slate-950 text-white'}`}>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 ${isDark ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}
                                >
                                    <Minus size={12} strokeWidth={4} />
                                </button>
                                <span className="px-3 text-xs font-black min-w-[28px] text-center">
                                    {cartItem.quantity}
                                </span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onAdd(); }}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 ${isDark ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}
                                >
                                    <Plus size={12} strokeWidth={4} />
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                                className={`h-10 px-4 rounded-xl flex items-center gap-2 transition-all active:scale-95 group/btn ${isDark ? 'bg-white text-slate-950 hover:bg-slate-100 shadow-white/5' : 'bg-slate-950 text-white hover:shadow-xl hover:shadow-slate-950/20'}`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest italic">Add</span>
                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${isDark ? 'bg-slate-950/10' : 'bg-white/10'}`}>
                                    <Plus size={12} strokeWidth={4} />
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Merchant Signature Sub-layer */}
            <div className="px-6 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className={`text-[8px] font-black uppercase tracking-[0.3em] truncate italic text-center ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                    {item.merchants?.business_name || 'InTrust Official'}
                </p>
            </div>
        </motion.div>
    );
}
