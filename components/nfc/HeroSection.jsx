import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronRight, Cpu, Shield, Zap, ClipboardList } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import NFC3DCard from './NFC3DCard';

export default function HeroSection({ previewName }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const scrollToOrder = () => {
        const orderSection = document.getElementById('nfc-order-section');
        if (orderSection) {
            orderSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <section className={`relative min-h-[90vh] lg:h-screen flex flex-col items-center justify-center pt-24 pb-12 px-6 overflow-hidden transition-colors duration-700 ${isDark ? 'bg-[#08090b]' : 'bg-white'}`}>
            {/* Premium Background Architecture */}
            <div className="absolute inset-0 z-0">
                <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]`} />
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[120px] rounded-full opacity-20 ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/20'}`} />
            </div>

            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center z-10">
                {/* Text Content */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center lg:text-left flex flex-col items-center lg:items-start"
                >
                    {/* Protocol Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-blue-600/5 border border-blue-500/20 mb-8 backdrop-blur-md shadow-2xl shadow-blue-500/10"
                    >
                        <div className="flex -space-x-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-[pulse_1.5s_infinite]" />
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/80">Apply Now · Active</span>
                    </motion.div>

                    <h1 className={`text-[clamp(3.5rem,10vw,8rem)] font-black tracking-[-0.06em] leading-[0.85] uppercase italic mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        INTRUST<br />
                        <span className="inline-block relative text-blue-600">
                            SMART CARD
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ delay: 0.8, duration: 1.5, ease: "circOut" }}
                                className="absolute -bottom-2 left-0 h-[3px] bg-gradient-to-r from-blue-600 via-blue-400 to-transparent"
                            />
                        </span>
                    </h1>

                    <p className={`text-lg sm:text-xl font-bold max-w-xl leading-[1.4] mb-12 tracking-tight ${isDark ? 'text-white/30' : 'text-slate-500'}`}>
                        High-fidelity physical craftsmanship meets encrypted digital identity. <span className={`hidden lg:inline ${isDark ? 'text-white/60' : 'text-slate-900'}`}>The ultimate extension of your professional self.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <button
                            onClick={scrollToOrder}
                            className={`group relative w-full sm:w-auto px-12 py-6 font-black uppercase tracking-[0.3em] rounded-2xl overflow-hidden transition-all active:scale-95 shadow-2xl ${isDark ? 'bg-white text-black' : 'bg-slate-900 text-white shadow-slate-900/30'}`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3 text-[11px]">
                                Buy Now <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.16,1,0.3,1]" />
                        </button>

                        <Link
                            href="/customer/nfc-orders"
                            className={`group w-full sm:w-auto px-10 py-6 font-black uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 text-[11px] border-2 ${isDark ? 'border-white/10 text-white/60 hover:border-blue-500/50 hover:text-blue-400' : 'border-slate-200 text-slate-500 hover:border-blue-500 hover:text-blue-600'}`}
                        >
                            <ClipboardList size={16} /> My Orders
                        </Link>

                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help">
                                <Cpu size={18} className="text-blue-500" />
                                <span className="text-[8px] font-black uppercase tracking-widest">NTAG215</span>
                            </div>
                            <div className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help">
                                <Shield size={18} className="text-blue-500" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Secure</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 3D Card Preview */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="relative flex justify-center items-center"
                >
                    <div className="w-full max-w-[480px] aspect-[1.58/1] relative">
                        <motion.div
                            animate={{
                                y: [0, -15, 0],
                                rotateZ: [0, 1, 0]
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 6,
                                ease: "easeInOut"
                            }}
                        >
                            <NFC3DCard name={previewName} />
                        </motion.div>

                        {/* Shadow underneath */}
                        <motion.div
                            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                            className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-2/3 h-6 bg-black/40 blur-2xl rounded-full"
                        />
                    </div>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute bottom-8 flex flex-col items-center gap-4 hidden sm:flex"
            >
                <div className={`w-[1px] h-10 bg-gradient-to-b from-blue-500 to-transparent`} />
                <span className={`text-[8px] font-black uppercase tracking-[0.5em] ${isDark ? 'text-white/20' : 'text-slate-400'}`}>Discover</span>
            </motion.div>
        </section>
    );
}
