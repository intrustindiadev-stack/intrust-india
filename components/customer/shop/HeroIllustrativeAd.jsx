'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Package, Clock, Star, Heart, ArrowRight, ShoppingCart } from 'lucide-react';

export default function HeroIllustrativeAd() {
    return (
        <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 border border-indigo-100 dark:border-white/5 shadow-xl shadow-indigo-100/50 dark:shadow-none mb-6 group cursor-pointer">
            {/* Background Abstract Shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-200/50 to-transparent dark:from-indigo-500/10 rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-violet-200/50 to-transparent dark:from-violet-500/10 rounded-tr-full pointer-events-none" />
            
            {/* Decorative Stars */}
            <motion.div 
                animate={{ rotate: 360, scale: [1, 1.2, 1] }} 
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute top-6 right-10 text-amber-400 opacity-60 pointer-events-none"
            >
                <Star size={16} fill="currentColor" />
            </motion.div>
            <motion.div 
                animate={{ rotate: -360, scale: [1, 1.5, 1] }} 
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-8 left-1/2 text-emerald-400 opacity-40 pointer-events-none"
            >
                <Star size={12} fill="currentColor" />
            </motion.div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
                
                {/* Left Content Area */}
                <div className="flex-1 space-y-4 z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-white/10 shadow-sm border border-slate-100 dark:border-white/5 backdrop-blur-sm shadow-indigo-500/10">
                        <ShoppingCart size={12} className="text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Premium Shopping</span>
                    </div>
                    
                    <div>
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            Discover Top Brands. <br className="hidden md:block"/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                                Delivered with Care.
                            </span>
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-medium max-w-sm">
                            Shop a vast selection of premium products, electronics, and daily essentials across our trusted merchant network.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-100 flex items-center justify-center p-1.5 z-30 shadow-sm">
                                <ShieldCheck className="w-full h-full text-indigo-600" />
                            </div>
                            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-100 flex items-center justify-center p-1.5 z-20 shadow-sm">
                                <Package className="w-full h-full text-emerald-600" />
                            </div>
                            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-amber-100 flex items-center justify-center p-1.5 z-10 shadow-sm">
                                <Star className="w-full h-full text-amber-600" />
                            </div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                            Guaranteed Authenticity<br/>& Secure Checkout
                        </p>
                    </div>
                </div>

                {/* Right Illustration Area - Image instead of SVG icons */}
                <div className="w-full md:w-[40%] h-48 md:h-auto min-h-[160px] relative mt-4 md:mt-0 flex justify-end">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, type: "spring" }}
                        className="relative w-full max-w-[240px] aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 border-4 border-white/50 dark:border-white/10 mx-auto md:mx-0"
                    >
                        {/* 
                            This references the AI generated image stored in public/images/ecommerce_shopping_ad.png 
                        */}
                        <img 
                            src="/images/ecommerce_shopping_ad.png" 
                            alt="Premium E-Commerce Platform" 
                            className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent pointer-events-none" />
                    </motion.div>
                </div>
            </div>

            {/* Bottom click affordance */}
            <div className="absolute right-4 bottom-4 w-8 h-8 rounded-full bg-white dark:bg-indigo-500 flex items-center justify-center shadow-md scale-0 group-hover:scale-100 transition-transform duration-300 z-30">
                <ArrowRight size={14} className="text-indigo-600 dark:text-white" />
            </div>
        </div>
    );
}
