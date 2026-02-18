'use client';

import { motion } from 'framer-motion';
import { Apple, Smartphone, Shield, Zap, CreditCard } from 'lucide-react';
import Image from 'next/image';

const StoreButton = ({ icon: Icon, label, subLabel, href = "#", variant = "dark" }) => (
    <motion.button
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
            relative group overflow-hidden flex items-center gap-4 px-8 py-4 rounded-2xl transition-all duration-300 border min-w-[210px] justify-start shadow-lg
            ${variant === 'dark'
                ? 'bg-[#171A21] border-[#171A21] text-white shadow-[#171A21]/20 hover:shadow-[#171A21]/40'
                : 'bg-white border-slate-100 text-[#171A21] shadow-slate-200/50 hover:border-blue-200'}
        `}
    >
        {/* Subtle hover gradient for dark button */}
        {variant === 'dark' && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-x-[-100%] group-hover:translate-x-[100%]" />
        )}

        <div className={`p-2 rounded-xl ${variant === 'dark' ? 'bg-white/10' : 'bg-slate-50'}`}>
            <Icon size={28} className={variant === 'dark' ? 'text-white' : 'text-[#171A21]'} />
        </div>
        <div className="text-left flex flex-col leading-none">
            <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${variant === 'dark' ? 'text-white/60' : 'text-slate-400'}`}>
                {subLabel}
            </span>
            <span className="text-xl font-bold font-[family-name:var(--font-outfit)] tracking-tight">
                {label}
            </span>
        </div>
    </motion.button>
);

const TrustItem = ({ icon: Icon, label }) => (
    <motion.div
        whileHover={{ scale: 1.05 }}
        className="flex items-center gap-2 px-4 py-2"
    >
        <Icon size={16} className="text-[#92BCEA]" strokeWidth={2.5} />
<<<<<<< HEAD
        <span className="text-xs font-bold uppercase tracking-widest text-[#617073]">{label}</span>
=======
        <span className="text-xs font-bold uppercase tracking-widest text-[#617073] dark:text-gray-400">{label}</span>
>>>>>>> origin/yogesh-final
    </motion.div>
);

export default function CTASection() {
    return (
<<<<<<< HEAD
        <section className="relative py-12 md:py-20 bg-white overflow-hidden font-[family-name:var(--font-outfit)] flex flex-col items-center justify-center">
=======
        <section className="relative py-12 md:py-20 bg-white dark:bg-gray-900 overflow-hidden font-[family-name:var(--font-outfit)] flex flex-col items-center justify-center">
>>>>>>> origin/yogesh-final

            {/* Minimal Background - Subtle & Clean */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full">
                    <motion.div
                        animate={{
                            opacity: [0.3, 0.5, 0.3],
                            scale: [1, 1.05, 1],
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#92BCEA]/10 rounded-full blur-[100px]"
                    />
                    <motion.div
                        animate={{
                            opacity: [0.3, 0.5, 0.3],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#AFB3F7]/10 rounded-full blur-[120px]"
                    />
                </div>
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center text-center">

                {/* Brand Logo - Minimal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-6"
                >
                    <Image
                        src="/icons/intrustLogo.png"
                        alt="INTRUST"
                        width={64}
                        height={64}
                        className="object-contain drop-shadow-sm"
                        priority
                    />
                </motion.div>

                {/* Heading - Crisp & Modern */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="mb-4"
                >
<<<<<<< HEAD
                    <h2 className="text-4xl md:text-6xl font-bold text-[#171A21] tracking-tight leading-[1.1]">
=======
                    <h2 className="text-4xl md:text-6xl font-bold text-[#171A21] dark:text-gray-100 tracking-tight leading-[1.1]">
>>>>>>> origin/yogesh-final
                        The future of banking is <br />
                        <span className="text-[#92BCEA]">here and now.</span>
                    </h2>
                </motion.div>

                {/* Description - Meaningful Whitespace */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
<<<<<<< HEAD
                    className="text-lg md:text-xl text-[#617073] max-w-lg mx-auto mb-8 leading-relaxed"
                >
                    Join <span className="font-semibold text-[#171A21]">50,000+ users</span> experiencing the next generation of financial freedom.
=======
                    className="text-lg md:text-xl text-[#617073] dark:text-gray-300 max-w-lg mx-auto mb-8 leading-relaxed"
                >
                    Join <span className="font-semibold text-[#171A21] dark:text-gray-100">50,000+ users</span> experiencing the next generation of financial freedom.
>>>>>>> origin/yogesh-final
                </motion.p>

                {/* Actions - Clean Layout */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full mb-8"
                >
                    <StoreButton
                        icon={Apple}
                        label="App Store"
                        subLabel="Download on the"
                        variant="dark"
                    />
                    <StoreButton
                        icon={Smartphone}
                        label="Google Play"
                        subLabel="Get it on"
                        variant="white"
                    />
                </motion.div>

                {/* Trust Row - Minimal Dividers */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="flex flex-wrap items-center justify-center gap-6 md:gap-12 pt-8 border-t border-slate-100 w-full max-w-2xl"
                >
                    <TrustItem icon={Shield} label="Bank Grade Security" />
                    <TrustItem icon={Zap} label="Instant Transfers" />
                    <TrustItem icon={CreditCard} label="Zero Components" />
                </motion.div>

            </div>
        </section>
    );
}
