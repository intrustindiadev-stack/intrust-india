'use client';

import { motion } from 'framer-motion';

export default function PageHero({ title, subtitle, variant = 'default', className = "" }) {

    // Variant configurations
    const variants = {
        default: {
            background: "bg-[#171A21]",
            blob1: "bg-[#92BCEA]/10",
            blob2: "bg-[#AFB3F7]/10",
            overlay: "bg-[radial-gradient(circle_at_top_right,rgba(122,147,172,0.15)_0%,rgba(23,26,33,0)_50%)]"
        },
        about: {
            background: "bg-[#0F172A]", // Slate 900
            blob1: "bg-blue-500/20",
            blob2: "bg-teal-400/20",
            overlay: "bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.2)_0%,rgba(15,23,42,0)_60%)]",
            pattern: "opacity-[0.05] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
        },
        contact: {
            background: "bg-[#1E1B4B]", // Indigo 950
            blob1: "bg-purple-500/20",
            blob2: "bg-pink-400/20",
            overlay: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-transparent to-transparent opacity-50",
            pattern: "opacity-[0.03] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
        }
    };

    const theme = variants[variant] || variants.default;

    return (
        <div className={`relative pt-44 pb-32 px-6 overflow-hidden ${theme.background} ${className}`}>
            {/* Dynamic Background Elements */}

            {/* Overlay Gradient */}
            <div className={`absolute inset-0 ${theme.overlay}`} />

            {/* Variant Specific Patterns */}
            {variant === 'about' && (
                <>
                    <div className={`absolute inset-0 ${theme.pattern}`} />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] border border-blue-500/10 rounded-full border-dashed"
                    />
                </>
            )}

            {variant === 'contact' && (
                <>
                    <div className={`absolute inset-0 ${theme.pattern}`} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-[#1E1B4B]" />
                    {/* Floating bubbles for contact */}
                    <motion.div
                        animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 5, repeat: Infinity }}
                        className="absolute top-1/4 left-10 w-4 h-4 rounded-full bg-pink-400 blur-sm"
                    />
                    <motion.div
                        animate={{ y: [0, 30, 0], opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 7, repeat: Infinity }}
                        className="absolute bottom-1/3 right-10 w-6 h-6 rounded-full bg-purple-400 blur-sm"
                    />
                </>
            )}

            {/* Animated Blobs (Common but themed) */}
            <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] ${theme.blob1} rounded-full blur-[100px] animate-floatSlow`} />
            <div className={`absolute bottom-[-20%] right-[-5%] w-[500px] h-[500px] ${theme.blob2} rounded-full blur-[100px] animate-float`} style={{ animationDelay: '2s' }} />

            {/* Connecting Lines for Default/Fallback */}
            {!['about', 'contact'].includes(variant) && (
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" style={{ backgroundSize: '30px 30px' }} />
            )}

            <div className="max-w-7xl mx-auto text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-6 inline-block"
                >
                    {/* Optional decorative tag based on variant */}
                    {variant === 'about' && (
                        <span className="px-4 py-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300 text-sm font-semibold tracking-wider uppercase mb-4 inline-block backdrop-blur-md">
                            Our Story
                        </span>
                    )}
                    {variant === 'contact' && (
                        <span className="px-4 py-1.5 rounded-full border border-purple-400/30 bg-purple-500/10 text-purple-300 text-sm font-semibold tracking-wider uppercase mb-4 inline-block backdrop-blur-md">
                            Support 24/7
                        </span>
                    )}
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="text-5xl md:text-7xl font-black font-outfit text-white mb-6 tracking-tight leading-tight drop-shadow-xl"
                >
                    {title}
                </motion.h1>

                {subtitle && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-inter font-light leading-relaxed">
                            {subtitle}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}