'use client';

import React from 'react';
import { ShieldCheck, Package, Clock, Star, Heart, ArrowRight, ShoppingCart, Shirt, Smartphone, Watch, Headphones, Gift, Camera } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function HeroIllustrativeAd() {
    return (
        <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-900 via-blue-800 to-sky-500 shadow-[0_20px_60px_-15px_rgba(30,58,138,0.5)] mb-6 group cursor-pointer border border-blue-400/20">
            
            {/* Background Decorative Elements */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-[80px] pointer-events-none mix-blend-overlay" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/30 rounded-full blur-[80px] pointer-events-none mix-blend-overlay" />
            
            {/* Subtle Grid Pattern Overlay */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-[0.07]"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            />

            {/* E-commerce Background Icons (Faint) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.05] text-white">
                <motion.div animate={{ y: [0, -10, 0], rotate: [12, 16, 12] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-10 -left-10">
                    <Shirt size={120} />
                </motion.div>
                <motion.div animate={{ y: [0, 15, 0], rotate: [-12, -8, -12] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-20 right-[30%]">
                    <Headphones size={160} />
                </motion.div>
                <motion.div animate={{ x: [0, 10, 0], rotate: [45, 50, 45] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute -bottom-10 left-[20%]">
                    <Watch size={100} />
                </motion.div>
                <motion.div animate={{ y: [0, -15, 0], rotate: [-12, -18, -12] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute top-1/2 -right-10">
                    <Camera size={140} />
                </motion.div>
                <motion.div animate={{ y: [0, 10, 0], rotate: [12, 5, 12] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} className="absolute bottom-10 right-[10%]">
                    <Gift size={80} />
                </motion.div>
                <motion.div animate={{ x: [0, -10, 0], rotate: [-12, -15, -12] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }} className="absolute top-10 left-[40%]">
                    <Smartphone size={100} />
                </motion.div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-10 gap-8">

                {/* Left Content Area */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 space-y-6 z-10 w-full md:pr-8"
                >
                    <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-sm">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-white/20 flex items-center justify-center border border-white/30 shrink-0">
                            <Image 
                                src="/logo.png" 
                                alt="Intrust Logo" 
                                width={20} 
                                height={20} 
                                className="object-cover"
                            />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Your Neighborhood Hub</span>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1]">
                            Shop Local. <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-white">
                                Delivered Fast.
                            </span>
                        </h2>
                        <p className="text-sm md:text-base text-blue-100 font-medium max-w-md leading-relaxed opacity-90">
                            Connect with the best merchants in your area. Get fresh groceries, electronics, and daily essentials right at your fingertips.
                        </p>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="flex items-center gap-6 pt-2"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
                                <ShieldCheck size={18} className="text-sky-200" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] uppercase tracking-widest text-sky-300 font-bold">Trusted</span>
                                <span className="text-sm font-bold text-white">Top Merchants</span>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-white/20 hidden sm:block" />
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
                                <Clock size={18} className="text-sky-200" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] uppercase tracking-widest text-sky-300 font-bold">Delivery</span>
                                <span className="text-sm font-bold text-white">Same Day</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Right Illustration Area */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full md:w-[45%] lg:w-[40%] flex justify-center md:justify-end mt-4 md:mt-0"
                >
                    <div className="relative w-full max-w-[280px] aspect-[4/3] group/image">
                        {/* Soft glow behind image */}
                        <div className="absolute inset-0 bg-sky-400 blur-2xl rounded-3xl transition-opacity duration-700 opacity-20 group-hover/image:opacity-50" />
                        
                        <div className="relative w-full h-full rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 backdrop-blur-sm">
                            <Image
                                src="/images/ecommerce_shopping_ad.png"
                                alt="Local Shopping"
                                fill
                                sizes="(max-width: 768px) 100vw, 300px"
                                className="object-cover opacity-95 group-hover/image:opacity-100 group-hover/image:scale-105 transition-all duration-700 ease-out"
                                loading="lazy"
                                quality={90}
                            />
                            {/* Inner gradient overlay for depth */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/60 via-transparent to-transparent opacity-80" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Premium action button / Explore affordance */}
            <div className="absolute bottom-0 right-0 p-6 md:p-8 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white text-indigo-700 shadow-lg flex items-center justify-center hover:bg-blue-50 hover:scale-105 transition-all">
                    <ArrowRight size={20} />
                </div>
            </div>
        </div>
    );
}
