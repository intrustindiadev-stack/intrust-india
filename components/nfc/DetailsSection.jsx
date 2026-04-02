'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Layers, Smartphone, Fingerprint, Lock } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function DetailsSection() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const features = [
        {
            icon: <Fingerprint className="text-blue-500" size={24} />,
            title: "Identity Protection",
            desc: "Encrypted memory ensures your data is only accessible to those you trust."
        },
        {
            icon: <Zap className="text-blue-500" size={24} />,
            title: "Instant Transmissions",
            desc: "NTAG215 hardware for zero-latency networking on all modern smartphones."
        },
        {
            icon: <Layers className="text-blue-500" size={24} />,
            title: "Universal Link",
            desc: "One tap to share your website, social profiles, business card, or portfolio."
        },
        {
            icon: <Shield className="text-blue-500" size={24} />,
            title: "Elite Build",
            desc: "Crafted from aerospace polymers with a professional-grade matte finish."
        }
    ];

    return (
        <section className={`relative py-20 sm:py-32 px-6 overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#08090b]' : 'bg-slate-50'}`}>
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch relative z-10">
                {/* Visual Narrative */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col justify-center space-y-8 text-center lg:text-left"
                >
                    <div className="space-y-4">
                        <span className={`text-[10px] sm:text-[12px] font-black uppercase tracking-[0.6em] ${isDark ? 'text-blue-500' : 'text-blue-600'}`}>The InTrust Protocol</span>
                        <h2 className={`text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter uppercase italic leading-[0.9] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Forged for<br /><span className="text-blue-600">Professionals.</span>
                        </h2>
                    </div>
                    
                    <p className={`text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                        The InTrust One is not just a card. It's a high-performance networking engine encased in premium hardware, designed for the modern elite who value speed and security.
                    </p>

                    {/* Quick Stats */}
                    <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-2xl font-black italic text-blue-600 tracking-tighter">0.1s</span>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Sync Speed</span>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <div className="flex flex-col gap-1">
                            <span className="text-2xl font-black italic text-blue-600 tracking-tighter">100%</span>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Native Tech</span>
                        </div>
                    </div>
                </motion.div>

                {/* Feature Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-8 rounded-3xl border transition-all duration-300 flex flex-col gap-6 ${isDark ? 'bg-white/[0.03] border-white/5 hover:border-blue-500/30' : 'bg-white border-slate-200 shadow-sm hover:border-blue-600'}`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-blue-50'}`}>
                                {feature.icon}
                            </div>
                            <div className="space-y-2">
                                <h3 className={`text-lg font-black uppercase tracking-tight italic ${isDark ? 'text-white' : 'text-slate-800'}`}>{feature.title}</h3>
                                <p className={`text-sm font-medium tracking-tight leading-relaxed ${isDark ? 'text-white/30' : 'text-slate-500'}`}>{feature.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Subtle Gradient Accent */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[150px] rounded-full pointer-events-none opacity-10 ${isDark ? 'bg-blue-600/30' : 'bg-blue-400/20'}`} />
        </section>
    );
}
