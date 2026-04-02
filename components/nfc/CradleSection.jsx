'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/contexts/ThemeContext';
import NFC3DCard from './NFC3DCard';

export default function CradleSection({ name }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <section className={`relative min-h-screen py-24 flex flex-col items-center justify-center overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#08090b]' : 'bg-white'}`}>
            {/* Background Texture Integration */}
            <div className={`absolute inset-0 z-0 ${isDark ? 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.04)_0%,transparent_70%)]'}`} />
            <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none`} />

            <div className="text-center z-10 space-y-6 mb-20 max-w-2xl px-6 relative">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="inline-block"
                >
                    <span className={`text-[10px] font-black uppercase tracking-[0.8em] ${isDark ? 'text-blue-500' : 'text-blue-600'} block mb-6 animate-pulse`}>Architecture Bridge</span>
                </motion.div>
                <h2 className={`text-5xl sm:text-8xl font-black tracking-tight uppercase italic leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Digital <span className="text-blue-500">Twins.</span>
                </h2>
                <p className={`text-[11px] font-black uppercase tracking-[0.4em] leading-relaxed max-w-lg mx-auto ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                    Your physical extension manifests here first. Bridging the gap between the protocols and the forge.
                </p>
            </div>

            {/* Premium Pdestal Area */}
            <div className="relative w-full max-w-4xl mx-auto flex justify-center px-6 z-10">
                <div className="w-full max-w-[440px] relative p-12">
                    {/* The 3D Card manifestation */}
                    <div className="relative z-20">
                        <NFC3DCard name={name || "CHOOSE NAME"} scale={1.1} />
                    </div>

                    {/* Pedestal Shadow and Glow */}
                    <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-4/5 h-12 rounded-full blur-[40px] ${isDark ? 'bg-blue-600/30' : 'bg-blue-600/10'}`} />
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                        <div className="w-[1px] h-20 bg-gradient-to-b from-blue-500 to-transparent opacity-40 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-[0.8em] text-blue-500/60 whitespace-nowrap">Linking Active</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
